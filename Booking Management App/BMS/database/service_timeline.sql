-- =============================================
-- SERVICE HISTORY TIMELINE
-- =============================================
-- Complete history of user's appointments and activities

-- Activity timeline events
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'appointment_booked', 'appointment_confirmed', 'appointment_cancelled',
    'appointment_completed', 'appointment_rescheduled', 'appointment_reminder',
    'payment_made', 'refund_received', 'tip_sent',
    'review_left', 'review_response', 'badge_earned',
    'referral_sent', 'referral_completed', 'points_earned', 'points_redeemed',
    'subscription_started', 'subscription_renewed', 'subscription_cancelled',
    'package_purchased', 'package_redeemed', 'gift_card_sent', 'gift_card_received'
  )),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon name
  color TEXT, -- for UI display
  metadata JSONB DEFAULT '{}', -- Additional event-specific data
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User service preferences (learned over time)
CREATE TABLE IF NOT EXISTS public.user_preferences_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL, -- 'favorite_provider', 'preferred_time', 'service_frequency'
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5, -- 0-1 how confident we are
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, preference_type, preference_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_events_user ON public.timeline_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_appointment ON public.timeline_events(appointment_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON public.timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences_history(user_id);

-- Enable RLS
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own timeline"
  ON public.timeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences_history FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger function to create timeline events automatically
CREATE OR REPLACE FUNCTION create_timeline_event()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_icon TEXT;
  v_color TEXT;
BEGIN
  -- Determine event details based on type
  CASE TG_ARGV[0]
    WHEN 'appointment_booked' THEN
      v_title := 'Appointment Booked';
      v_icon := '📅';
      v_color := 'blue';
    WHEN 'appointment_completed' THEN
      v_title := 'Appointment Completed';
      v_icon := '✅';
      v_color := 'green';
    WHEN 'payment_made' THEN
      v_title := 'Payment Made';
      v_icon := '💳';
      v_color := 'purple';
    WHEN 'review_left' THEN
      v_title := 'Review Posted';
      v_icon := '⭐';
      v_color := 'yellow';
    WHEN 'badge_earned' THEN
      v_title := 'Badge Earned';
      v_icon := '🏆';
      v_color := 'gold';
    ELSE
      v_title := TG_ARGV[0];
      v_icon := '📌';
      v_color := 'gray';
  END CASE;

  INSERT INTO public.timeline_events (
    user_id,
    appointment_id,
    event_type,
    title,
    icon,
    color,
    metadata
  )
  VALUES (
    NEW.user_id,
    CASE WHEN TG_TABLE_NAME = 'appointments' THEN NEW.id ELSE NULL END,
    TG_ARGV[0],
    v_title,
    v_icon,
    v_color,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get user service summary
CREATE OR REPLACE FUNCTION get_user_service_summary(p_user_id UUID)
RETURNS TABLE (
  total_appointments INTEGER,
  completed_appointments INTEGER,
  cancelled_appointments INTEGER,
  total_spent NUMERIC,
  favorite_provider_id UUID,
  favorite_provider_name TEXT,
  favorite_service_id UUID,
  favorite_service_name TEXT,
  average_rating_given NUMERIC,
  member_since TIMESTAMPTZ,
  last_appointment TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
      COUNT(*) FILTER (WHERE a.status = 'cancelled') as cancelled,
      COALESCE(SUM(a.total_price) FILTER (WHERE a.status = 'completed'), 0) as spent,
      MIN(a.created_at) as first_appointment,
      MAX(a.start_time) as last_appt
    FROM public.appointments a
    WHERE a.user_id = p_user_id
  ),
  fav_provider AS (
    SELECT a.provider_id, p.full_name, COUNT(*) as cnt
    FROM public.appointments a
    JOIN public.profiles p ON a.provider_id = p.id
    WHERE a.user_id = p_user_id AND a.status = 'completed'
    GROUP BY a.provider_id, p.full_name
    ORDER BY cnt DESC
    LIMIT 1
  ),
  fav_service AS (
    SELECT a.service_id, s.name, COUNT(*) as cnt
    FROM public.appointments a
    JOIN public.services s ON a.service_id = s.id
    WHERE a.user_id = p_user_id AND a.status = 'completed'
    GROUP BY a.service_id, s.name
    ORDER BY cnt DESC
    LIMIT 1
  ),
  avg_rating AS (
    SELECT AVG(r.rating)::NUMERIC as avg_rating
    FROM public.reviews r
    WHERE r.user_id = p_user_id
  )
  SELECT
    stats.total::INTEGER,
    stats.completed::INTEGER,
    stats.cancelled::INTEGER,
    stats.spent,
    fav_provider.provider_id,
    fav_provider.full_name,
    fav_service.service_id,
    fav_service.name,
    ROUND(avg_rating.avg_rating, 1),
    stats.first_appointment,
    stats.last_appt
  FROM stats
  LEFT JOIN fav_provider ON true
  LEFT JOIN fav_service ON true
  LEFT JOIN avg_rating ON true;
END;
$$ LANGUAGE plpgsql;
