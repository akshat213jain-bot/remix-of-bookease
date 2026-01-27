-- =============================================
-- CANCELLATION FEES
-- =============================================
-- Support for cancellation policies and fees

-- Cancellation policies per provider
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE, -- null for all services
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]', -- Array of {hours_before, fee_type, fee_value}
  allow_reschedule BOOLEAN DEFAULT true,
  reschedule_fee_waived BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Example rules: [
--   {"hours_before": 24, "fee_type": "percentage", "fee_value": 0},     -- Free cancellation 24+ hours
--   {"hours_before": 12, "fee_type": "percentage", "fee_value": 25},    -- 25% fee 12-24 hours
--   {"hours_before": 0, "fee_type": "percentage", "fee_value": 50}      -- 50% fee under 12 hours
-- ]

-- Cancellation records
CREATE TABLE IF NOT EXISTS public.cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE UNIQUE,
  cancelled_by UUID NOT NULL REFERENCES auth.users(id),
  canceller_type TEXT NOT NULL CHECK (canceller_type IN ('user', 'provider', 'admin', 'system')),
  reason TEXT,
  reason_category TEXT CHECK (reason_category IN ('schedule_conflict', 'emergency', 'changed_mind', 'found_alternative', 'price', 'service_issue', 'other')),
  hours_before_appointment NUMERIC,
  policy_id UUID REFERENCES public.cancellation_policies(id),
  fee_applied NUMERIC DEFAULT 0,
  fee_waived BOOLEAN DEFAULT false,
  fee_waiver_reason TEXT,
  refund_amount NUMERIC DEFAULT 0,
  refund_status TEXT DEFAULT 'pending' CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed', 'not_applicable')),
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_provider ON public.cancellation_policies(provider_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_appointment ON public.cancellations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_cancelled_by ON public.cancellations(cancelled_by);

-- Enable RLS
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can manage their cancellation policies"
  ON public.cancellation_policies FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Anyone can view active policies"
  ON public.cancellation_policies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own cancellations"
  ON public.cancellations FOR SELECT
  USING (auth.uid() = cancelled_by);

CREATE POLICY "Providers can view cancellations for their appointments"
  ON public.cancellations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE id = appointment_id AND provider_id = auth.uid()
    )
  );

-- Function to calculate cancellation fee
CREATE OR REPLACE FUNCTION calculate_cancellation_fee(
  p_appointment_id UUID
)
RETURNS TABLE (
  fee_amount NUMERIC,
  refund_amount NUMERIC,
  hours_before NUMERIC,
  policy_rule JSONB
) AS $$
DECLARE
  v_appointment RECORD;
  v_policy RECORD;
  v_hours_before NUMERIC;
  v_rule JSONB;
  v_fee NUMERIC := 0;
  v_paid_amount NUMERIC := 0;
BEGIN
  -- Get appointment details
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, '{}'::JSONB;
    RETURN;
  END IF;

  -- Calculate hours before appointment
  v_hours_before := EXTRACT(EPOCH FROM (v_appointment.start_time - now())) / 3600;

  -- Get applicable policy
  SELECT * INTO v_policy
  FROM public.cancellation_policies
  WHERE provider_id = v_appointment.provider_id
    AND is_active = true
    AND (service_id = v_appointment.service_id OR service_id IS NULL)
  ORDER BY service_id NULLS LAST
  LIMIT 1;

  -- Get total paid amount
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
  FROM public.appointment_payments
  WHERE appointment_id = p_appointment_id
    AND status = 'completed'
    AND payment_type != 'refund';

  IF v_policy IS NOT NULL AND v_policy.rules IS NOT NULL THEN
    -- Find applicable rule (first rule where hours_before is greater than current hours)
    FOR v_rule IN SELECT * FROM jsonb_array_elements(v_policy.rules) ORDER BY (elem->>'hours_before')::NUMERIC DESC
    LOOP
      IF v_hours_before <= (v_rule->>'hours_before')::NUMERIC THEN
        IF (v_rule->>'fee_type') = 'percentage' THEN
          v_fee := ROUND(v_paid_amount * ((v_rule->>'fee_value')::NUMERIC / 100), 2);
        ELSE
          v_fee := (v_rule->>'fee_value')::NUMERIC;
        END IF;
        
        RETURN QUERY SELECT v_fee, (v_paid_amount - v_fee), v_hours_before, v_rule;
        RETURN;
      END IF;
    END LOOP;
  END IF;

  -- No policy or past all rules - no fee
  RETURN QUERY SELECT 0::NUMERIC, v_paid_amount, v_hours_before, '{}'::JSONB;
END;
$$ LANGUAGE plpgsql;

-- Insert sample cancellation policy for demo
INSERT INTO public.cancellation_policies (provider_id, name, description, rules, is_default )
SELECT 
  id,
  'Standard Policy',
  'Free cancellation 24+ hours before. 25% fee within 24 hours. 50% fee within 6 hours.',
  '[
    {"hours_before": 168, "fee_type": "percentage", "fee_value": 0},
    {"hours_before": 24, "fee_type": "percentage", "fee_value": 25},
    {"hours_before": 6, "fee_type": "percentage", "fee_value": 50},
    {"hours_before": 0, "fee_type": "percentage", "fee_value": 100}
  ]'::JSONB,
  true
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.cancellation_policies)
LIMIT 1
ON CONFLICT DO NOTHING;
