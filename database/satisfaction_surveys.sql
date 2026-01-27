-- Table: satisfaction_surveys
-- Description: Post-appointment satisfaction surveys

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

-- Enable RLS
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their surveys" ON public.satisfaction_surveys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Providers can view their surveys" ON public.satisfaction_surveys
  FOR SELECT USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all surveys" ON public.satisfaction_surveys
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_surveys_appointment ON public.satisfaction_surveys(appointment_id);
