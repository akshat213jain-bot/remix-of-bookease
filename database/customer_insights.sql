-- =============================================
-- CUSTOMER INSIGHTS & ANALYTICS
-- =============================================
-- Analytics data for providers

-- Customer segments
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL, -- {"min_bookings": 5, "min_spent": 1000, "last_visit_days": 30}
  color TEXT DEFAULT '#6366f1',
  is_auto BOOLEAN DEFAULT false, -- Auto-updated by system
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer segment membership
CREATE TABLE IF NOT EXISTS public.customer_segment_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(segment_id, customer_id)
);

-- Customer metrics (cached for performance)
CREATE TABLE IF NOT EXISTS public.customer_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  average_booking_value NUMERIC DEFAULT 0,
  total_tips NUMERIC DEFAULT 0,
  first_booking_date TIMESTAMPTZ,
  last_booking_date TIMESTAMPTZ,
  average_rating_given NUMERIC,
  reviews_count INTEGER DEFAULT 0,
  referrals_made INTEGER DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  customer_lifetime_value NUMERIC DEFAULT 0,
  churn_risk_score NUMERIC DEFAULT 0, -- 0-100
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, customer_id)
);

-- Provider analytics snapshots (daily)
CREATE TABLE IF NOT EXISTS public.provider_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_tips NUMERIC DEFAULT 0,
  average_rating NUMERIC,
  peak_hour INTEGER, -- 0-23
  most_popular_service_id UUID,
  booking_conversion_rate NUMERIC, -- views to bookings
  cancellation_rate NUMERIC,
  customer_satisfaction_score NUMERIC,
  UNIQUE(provider_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_segments_provider ON public.customer_segments(provider_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_members_segment ON public.customer_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_provider ON public.customer_metrics(provider_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_customer ON public.customer_metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_provider_analytics_provider_date ON public.provider_analytics(provider_id, date DESC);

-- Enable RLS
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can manage their segments"
  ON public.customer_segments FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can manage segment members"
  ON public.customer_segment_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_segments
      WHERE id = segment_id AND provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view their customer metrics"
  ON public.customer_metrics FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can view their analytics"
  ON public.provider_analytics FOR SELECT
  USING (auth.uid() = provider_id);

-- Function to calculate customer metrics
CREATE OR REPLACE FUNCTION calculate_customer_metrics(
  p_provider_id UUID,
  p_customer_id UUID
)
RETURNS public.customer_metrics AS $$
DECLARE
  v_metrics public.customer_metrics;
BEGIN
  SELECT
    gen_random_uuid(),
    p_provider_id,
    p_customer_id,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'no_show'),
    COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0),
    COALESCE(AVG(total_price) FILTER (WHERE status = 'completed'), 0),
    0, -- tips calculated separately
    MIN(created_at),
    MAX(start_time) FILTER (WHERE status = 'completed'),
    NULL,
    0,
    0,
    0,
    0,
    0,
    now()
  INTO v_metrics
  FROM public.appointments
  WHERE provider_id = p_provider_id AND user_id = p_customer_id;

  -- Calculate CLV (simplified: avg booking value * expected future bookings)
  v_metrics.customer_lifetime_value := v_metrics.average_booking_value * 
    GREATEST(v_metrics.completed_bookings * 0.5, 3); -- Assume 50% rebooking rate, min 3

  -- Calculate churn risk
  IF v_metrics.last_booking_date IS NOT NULL THEN
    v_metrics.churn_risk_score := LEAST(100, 
      EXTRACT(DAY FROM (now() - v_metrics.last_booking_date)) * 1.5
    );
  END IF;

  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- Function to get provider dashboard stats
CREATE OR REPLACE FUNCTION get_provider_dashboard_stats(p_provider_id UUID)
RETURNS TABLE (
  total_customers INTEGER,
  new_customers_this_month INTEGER,
  total_revenue_this_month NUMERIC,
  average_rating NUMERIC,
  top_customers JSONB,
  at_risk_customers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT user_id) as total,
      COUNT(DISTINCT user_id) FILTER (
        WHERE created_at >= date_trunc('month', now())
      ) as new_this_month,
      COALESCE(SUM(total_price) FILTER (
        WHERE status = 'completed' AND start_time >= date_trunc('month', now())
      ), 0) as revenue
    FROM public.appointments
    WHERE provider_id = p_provider_id
  ),
  avg_rating AS (
    SELECT COALESCE(AVG(rating), 0) as rating
    FROM public.reviews
    WHERE provider_id = p_provider_id
  ),
  top AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'customer_id', user_id,
        'total_spent', total_spent
      ) ORDER BY total_spent DESC
    ) as top_custs
    FROM (
      SELECT user_id, SUM(total_price) as total_spent
      FROM public.appointments
      WHERE provider_id = p_provider_id AND status = 'completed'
      GROUP BY user_id
      ORDER BY total_spent DESC
      LIMIT 5
    ) t
  ),
  at_risk AS (
    SELECT COUNT(*) as cnt
    FROM public.customer_metrics
    WHERE provider_id = p_provider_id AND churn_risk_score > 70
  )
  SELECT
    stats.total::INTEGER,
    stats.new_this_month::INTEGER,
    stats.revenue,
    ROUND(avg_rating.rating, 1),
    COALESCE(top.top_custs, '[]'::jsonb),
    at_risk.cnt::INTEGER
  FROM stats, avg_rating, top, at_risk;
END;
$$ LANGUAGE plpgsql;
