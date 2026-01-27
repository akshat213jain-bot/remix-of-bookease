-- =============================================
-- REVENUE FORECASTING
-- =============================================
-- AI-powered revenue predictions for providers

-- Revenue forecast history
CREATE TABLE IF NOT EXISTS public.revenue_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('daily', 'weekly', 'monthly')),
  predicted_revenue NUMERIC NOT NULL,
  predicted_bookings INTEGER NOT NULL,
  confidence_level NUMERIC, -- 0-100
  actual_revenue NUMERIC, -- Filled after the date passes
  actual_bookings INTEGER,
  accuracy_score NUMERIC, -- Calculated after actuals
  factors JSONB DEFAULT '{}', -- What influenced the prediction
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue goals
CREATE TABLE IF NOT EXISTS public.revenue_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_revenue NUMERIC NOT NULL,
  target_bookings INTEGER,
  current_revenue NUMERIC DEFAULT 0,
  current_bookings INTEGER DEFAULT 0,
  progress_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'missed', 'exceeded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Historical trends (aggregated data)
CREATE TABLE IF NOT EXISTS public.revenue_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month')),
  revenue NUMERIC DEFAULT 0,
  bookings INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  average_order_value NUMERIC DEFAULT 0,
  tips NUMERIC DEFAULT 0,
  refunds NUMERIC DEFAULT 0,
  cancellation_cost NUMERIC DEFAULT 0,
  net_revenue NUMERIC DEFAULT 0,
  year_over_year_growth NUMERIC,
  month_over_month_growth NUMERIC,
  UNIQUE(provider_id, period_date, period_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_provider ON public.revenue_forecasts(provider_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_revenue_goals_provider ON public.revenue_goals(provider_id, period_start);
CREATE INDEX IF NOT EXISTS idx_revenue_trends_provider ON public.revenue_trends(provider_id, period_date DESC);

-- Enable RLS
ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view their forecasts"
  ON public.revenue_forecasts FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can manage their goals"
  ON public.revenue_goals FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can view their trends"
  ON public.revenue_trends FOR SELECT
  USING (auth.uid() = provider_id);

-- Function to generate simple revenue forecast
CREATE OR REPLACE FUNCTION generate_revenue_forecast(
  p_provider_id UUID,
  p_forecast_days INTEGER DEFAULT 30
)
RETURNS SETOF public.revenue_forecasts AS $$
DECLARE
  v_avg_daily_revenue NUMERIC;
  v_avg_daily_bookings NUMERIC;
  v_day_of_week_factors NUMERIC[];
  v_forecast_date DATE;
  v_day_factor NUMERIC;
  i INTEGER;
BEGIN
  -- Calculate average daily revenue from last 90 days
  SELECT 
    COALESCE(AVG(daily_rev), 0),
    COALESCE(AVG(daily_bookings), 0)
  INTO v_avg_daily_revenue, v_avg_daily_bookings
  FROM (
    SELECT 
      DATE(start_time) as day,
      SUM(total_price) as daily_rev,
      COUNT(*) as daily_bookings
    FROM public.appointments
    WHERE provider_id = p_provider_id
      AND status = 'completed'
      AND start_time >= now() - INTERVAL '90 days'
    GROUP BY DATE(start_time)
  ) daily;

  -- Calculate day-of-week factors
  SELECT ARRAY_AGG(COALESCE(factor, 1.0) ORDER BY dow)
  INTO v_day_of_week_factors
  FROM (
    SELECT 
      EXTRACT(DOW FROM DATE(start_time)) as dow,
      AVG(daily_rev) / NULLIF(v_avg_daily_revenue, 0) as factor
    FROM (
      SELECT DATE(start_time), SUM(total_price) as daily_rev
      FROM public.appointments
      WHERE provider_id = p_provider_id AND status = 'completed'
      GROUP BY DATE(start_time)
    ) d
    GROUP BY EXTRACT(DOW FROM DATE(start_time))
  ) dow_factors
  RIGHT JOIN generate_series(0, 6) as dow ON dow_factors.dow = dow;

  -- Generate forecasts
  FOR i IN 1..p_forecast_days LOOP
    v_forecast_date := CURRENT_DATE + i;
    v_day_factor := COALESCE(v_day_of_week_factors[EXTRACT(DOW FROM v_forecast_date)::INTEGER + 1], 1.0);

    RETURN QUERY
    INSERT INTO public.revenue_forecasts (
      provider_id,
      forecast_date,
      forecast_type,
      predicted_revenue,
      predicted_bookings,
      confidence_level,
      factors,
      model_version
    )
    VALUES (
      p_provider_id,
      v_forecast_date,
      'daily',
      ROUND(v_avg_daily_revenue * v_day_factor, 2),
      ROUND(v_avg_daily_bookings * v_day_factor)::INTEGER,
      CASE 
        WHEN i <= 7 THEN 85
        WHEN i <= 14 THEN 70
        WHEN i <= 30 THEN 55
        ELSE 40
      END,
      jsonb_build_object(
        'base_daily_revenue', v_avg_daily_revenue,
        'day_of_week_factor', v_day_factor,
        'data_days_used', 90
      ),
      'v1.0-simple'
    )
    ON CONFLICT DO NOTHING
    RETURNING *;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION update_revenue_goal_progress(p_goal_id UUID)
RETURNS public.revenue_goals AS $$
DECLARE
  v_goal public.revenue_goals;
BEGIN
  SELECT * INTO v_goal FROM public.revenue_goals WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT 
    COALESCE(SUM(total_price), 0),
    COUNT(*)
  INTO v_goal.current_revenue, v_goal.current_bookings
  FROM public.appointments
  WHERE provider_id = v_goal.provider_id
    AND status = 'completed'
    AND DATE(start_time) >= v_goal.period_start
    AND DATE(start_time) <= v_goal.period_end;

  v_goal.progress_percentage := ROUND(
    (v_goal.current_revenue / NULLIF(v_goal.target_revenue, 0)) * 100, 1
  );

  v_goal.status := CASE
    WHEN v_goal.period_end < CURRENT_DATE AND v_goal.progress_percentage >= 100 THEN 'achieved'
    WHEN v_goal.period_end < CURRENT_DATE AND v_goal.progress_percentage >= 110 THEN 'exceeded'
    WHEN v_goal.period_end < CURRENT_DATE THEN 'missed'
    ELSE 'in_progress'
  END;

  UPDATE public.revenue_goals SET
    current_revenue = v_goal.current_revenue,
    current_bookings = v_goal.current_bookings,
    progress_percentage = v_goal.progress_percentage,
    status = v_goal.status,
    updated_at = now()
  WHERE id = p_goal_id;

  RETURN v_goal;
END;
$$ LANGUAGE plpgsql;
