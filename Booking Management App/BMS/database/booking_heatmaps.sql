-- =============================================
-- BOOKING HEATMAPS
-- =============================================
-- Analyze booking patterns by time and day

-- Heatmap data aggregation
CREATE TABLE IF NOT EXISTS public.booking_heatmap_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  average_rating NUMERIC,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, service_id, day_of_week, hour_of_day, period_start)
);

-- Peak hours configuration
CREATE TABLE IF NOT EXISTS public.peak_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  price_multiplier NUMERIC DEFAULT 1.0 CHECK (price_multiplier >= 0.5 AND price_multiplier <= 3.0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, day_of_week, start_hour)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_heatmap_provider ON public.booking_heatmap_data(provider_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_lookup ON public.booking_heatmap_data(provider_id, day_of_week, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_peak_hours_provider ON public.peak_hours(provider_id, day_of_week);

-- Enable RLS
ALTER TABLE public.booking_heatmap_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peak_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view their heatmap data"
  ON public.booking_heatmap_data FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can manage their peak hours"
  ON public.peak_hours FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Function to generate heatmap data
CREATE OR REPLACE FUNCTION generate_booking_heatmap(
  p_provider_id UUID,
  p_days_back INTEGER DEFAULT 90
)
RETURNS SETOF public.booking_heatmap_data AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_end := CURRENT_DATE;
  v_period_start := CURRENT_DATE - p_days_back;

  -- Delete old data for this period
  DELETE FROM public.booking_heatmap_data
  WHERE provider_id = p_provider_id
    AND period_start = v_period_start;

  -- Insert new aggregated data
  RETURN QUERY
  INSERT INTO public.booking_heatmap_data (
    provider_id, service_id, day_of_week, hour_of_day,
    total_bookings, completed_bookings, cancelled_bookings, no_shows,
    total_revenue, average_rating, period_start, period_end
  )
  SELECT
    p_provider_id,
    a.service_id,
    EXTRACT(DOW FROM a.start_time)::INTEGER,
    EXTRACT(HOUR FROM a.start_time)::INTEGER,
    COUNT(*),
    COUNT(*) FILTER (WHERE a.status = 'completed'),
    COUNT(*) FILTER (WHERE a.status = 'cancelled'),
    COUNT(*) FILTER (WHERE a.status = 'no_show'),
    COALESCE(SUM(a.total_price) FILTER (WHERE a.status = 'completed'), 0),
    AVG(r.rating),
    v_period_start,
    v_period_end
  FROM public.appointments a
  LEFT JOIN public.reviews r ON a.id = r.appointment_id
  WHERE a.provider_id = p_provider_id
    AND a.start_time >= v_period_start
    AND a.start_time <= v_period_end
  GROUP BY a.service_id, EXTRACT(DOW FROM a.start_time), EXTRACT(HOUR FROM a.start_time)
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Function to get best/worst time slots
CREATE OR REPLACE FUNCTION get_time_slot_rankings(
  p_provider_id UUID,
  p_metric TEXT DEFAULT 'bookings' -- 'bookings', 'revenue', 'rating'
)
RETURNS TABLE (
  day_of_week INTEGER,
  hour_of_day INTEGER,
  day_name TEXT,
  time_label TEXT,
  metric_value NUMERIC,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.day_of_week,
    h.hour_of_day,
    CASE h.day_of_week
      WHEN 0 THEN 'Sunday'
      WHEN 1 THEN 'Monday'
      WHEN 2 THEN 'Tuesday'
      WHEN 3 THEN 'Wednesday'
      WHEN 4 THEN 'Thursday'
      WHEN 5 THEN 'Friday'
      WHEN 6 THEN 'Saturday'
    END,
    TO_CHAR(MAKE_TIME(h.hour_of_day, 0, 0), 'HH12:MI AM'),
    CASE p_metric
      WHEN 'bookings' THEN h.total_bookings::NUMERIC
      WHEN 'revenue' THEN h.total_revenue
      WHEN 'rating' THEN h.average_rating
      ELSE h.total_bookings::NUMERIC
    END,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE p_metric
          WHEN 'bookings' THEN h.total_bookings::NUMERIC
          WHEN 'revenue' THEN h.total_revenue
          WHEN 'rating' THEN h.average_rating
          ELSE h.total_bookings::NUMERIC
        END DESC NULLS LAST
    )::INTEGER
  FROM public.booking_heatmap_data h
  WHERE h.provider_id = p_provider_id
    AND h.service_id IS NULL -- Overall data
  ORDER BY 6;
END;
$$ LANGUAGE plpgsql;
