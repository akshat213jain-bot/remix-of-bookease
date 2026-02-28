-- =============================================
-- DEPOSITS & PARTIAL PAYMENTS
-- =============================================
-- Support for deposits and payment plans

-- Deposit configurations per provider/service
CREATE TABLE IF NOT EXISTS public.deposit_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE, -- null for all services
  deposit_type TEXT NOT NULL CHECK (deposit_type IN ('percentage', 'fixed')),
  deposit_value NUMERIC NOT NULL CHECK (deposit_value > 0),
  min_booking_amount NUMERIC DEFAULT 0, -- Minimum to require deposit
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Appointment payments (supports multiple payments)
CREATE TABLE IF NOT EXISTS public.appointment_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'partial', 'final', 'refund')),
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment reminders
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_payment_id UUID NOT NULL REFERENCES public.appointment_payments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'final_notice')),
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposit_settings_provider ON public.deposit_settings(provider_id);
CREATE INDEX IF NOT EXISTS idx_deposit_settings_service ON public.deposit_settings(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_appointment ON public.appointment_payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_user ON public.appointment_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_status ON public.appointment_payments(status, due_date);

-- Enable RLS
ALTER TABLE public.deposit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can manage their deposit settings"
  ON public.deposit_settings FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Anyone can view active deposit settings"
  ON public.deposit_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own payments"
  ON public.appointment_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
  ON public.appointment_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add deposit fields to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS total_price NUMERIC,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'deposit_paid', 'partial', 'paid', 'refunded'));

-- Function to calculate deposit amount
CREATE OR REPLACE FUNCTION calculate_deposit(
  p_provider_id UUID,
  p_service_id UUID,
  p_total_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_setting RECORD;
  v_deposit NUMERIC := 0;
BEGIN
  -- Check for service-specific setting first, then provider-wide
  SELECT * INTO v_setting
  FROM public.deposit_settings
  WHERE provider_id = p_provider_id
    AND is_active = true
    AND (service_id = p_service_id OR service_id IS NULL)
    AND p_total_amount >= min_booking_amount
  ORDER BY service_id NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    IF v_setting.deposit_type = 'percentage' THEN
      v_deposit := ROUND(p_total_amount * (v_setting.deposit_value / 100), 2);
    ELSE
      v_deposit := v_setting.deposit_value;
    END IF;
  END IF;

  RETURN v_deposit;
END;
$$ LANGUAGE plpgsql;

-- Function to get payment summary
CREATE OR REPLACE FUNCTION get_payment_summary(p_appointment_id UUID)
RETURNS TABLE (
  total_price NUMERIC,
  deposit_required NUMERIC,
  total_paid NUMERIC,
  remaining_balance NUMERIC,
  payment_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.total_price,
    a.deposit_amount as deposit_required,
    COALESCE(SUM(CASE WHEN ap.status = 'completed' AND ap.payment_type != 'refund' THEN ap.amount ELSE 0 END), 0) as total_paid,
    a.total_price - COALESCE(SUM(CASE WHEN ap.status = 'completed' AND ap.payment_type != 'refund' THEN ap.amount ELSE 0 END), 0) as remaining_balance,
    a.payment_status
  FROM public.appointments a
  LEFT JOIN public.appointment_payments ap ON a.id = ap.appointment_id
  WHERE a.id = p_appointment_id
  GROUP BY a.id;
END;
$$ LANGUAGE plpgsql;
