-- Table: user_analytics
-- Description: Aggregated analytics data for user booking patterns

CREATE TABLE IF NOT EXISTS public.user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_bookings integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  average_booking_value numeric DEFAULT 0,
  favorite_provider_id uuid REFERENCES public.provider_profiles(id),
  most_booked_day integer, -- 0=Sunday, 6=Saturday
  most_booked_time text, -- HH:MM format
  last_booking_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their analytics" ON public.user_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON public.user_analytics
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
