
-- =============================================
-- FIX 1: Prevent users from modifying payment fields on appointments
-- Users should only update: status (cancel), cancellation_reason, reschedule fields, notes
-- Payment fields must only be updated by service_role (edge functions)
-- =============================================

-- Create a trigger to protect payment fields from user modification
CREATE OR REPLACE FUNCTION public.protect_appointment_payment_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to modify anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow admins to modify anything
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For regular users/providers, prevent modification of payment fields
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status
     OR OLD.payment_amount IS DISTINCT FROM NEW.payment_amount
     OR OLD.payment_date IS DISTINCT FROM NEW.payment_date
     OR OLD.stripe_session_id IS DISTINCT FROM NEW.stripe_session_id
     OR OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id
     OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
  THEN
    RAISE EXCEPTION 'Payment fields can only be modified by the system';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_appointment_payments
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.protect_appointment_payment_fields();

-- =============================================
-- FIX 2: Create a public view for blocked dates without reason
-- =============================================

CREATE OR REPLACE VIEW public.provider_blocked_dates_public
WITH (security_invoker = true)
AS
SELECT
  id,
  provider_id,
  blocked_date
FROM public.provider_blocked_dates;

-- =============================================
-- FIX 3: Switch notifications to realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
