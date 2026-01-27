-- ==========================================
-- 1. PROVIDER VERIFICATION BADGES
-- ==========================================
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_documents text[],
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_type text;

-- ==========================================
-- 2. DISPUTE RESOLUTION SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  provider_id uuid REFERENCES public.provider_profiles(id) NOT NULL,
  dispute_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their disputes" ON public.disputes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers can view their disputes" ON public.disputes
  FOR SELECT USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all disputes" ON public.disputes
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 3. BUFFER TIME SETTINGS
-- ==========================================
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS buffer_time_before integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS buffer_time_after integer DEFAULT 15;

-- ==========================================
-- 4. TIME ZONE SUPPORT
-- ==========================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- ==========================================
-- 5. GROUP BOOKING DISCOUNTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.group_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  min_appointments integer NOT NULL DEFAULT 2,
  discount_percentage numeric NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage their discounts" ON public.group_discounts
  FOR ALL USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can view active discounts" ON public.group_discounts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all discounts" ON public.group_discounts
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 6. MULTI-PROVIDER BOOKING
-- ==========================================
CREATE TABLE IF NOT EXISTS public.booking_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text,
  total_amount numeric DEFAULT 0,
  discount_applied numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their booking groups" ON public.booking_groups
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all booking groups" ON public.booking_groups
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS booking_group_id uuid REFERENCES public.booking_groups(id);

-- ==========================================
-- 7. PUSH NOTIFICATION SUBSCRIPTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 8. AUTOMATED FOLLOW-UPS / SATISFACTION SURVEYS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  provider_id uuid REFERENCES public.provider_profiles(id) NOT NULL,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),
  would_recommend boolean,
  feedback text,
  sent_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their surveys" ON public.satisfaction_surveys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Providers can view their surveys" ON public.satisfaction_surveys
  FOR SELECT USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all surveys" ON public.satisfaction_surveys
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 9. USER ANALYTICS (booking patterns, spending)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_bookings integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  average_booking_value numeric DEFAULT 0,
  favorite_provider_id uuid REFERENCES public.provider_profiles(id),
  most_booked_day integer,
  most_booked_time text,
  last_booking_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their analytics" ON public.user_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON public.user_analytics
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 10. I18N - LANGUAGE PREFERENCES
-- ==========================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

-- ==========================================
-- 11. SMS NOTIFICATION PREFERENCES
-- ==========================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT false;

ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_disputes_appointment ON public.disputes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_surveys_appointment ON public.satisfaction_surveys(appointment_id);
CREATE INDEX IF NOT EXISTS idx_booking_groups_user ON public.booking_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);