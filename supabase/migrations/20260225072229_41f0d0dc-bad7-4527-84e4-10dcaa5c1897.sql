
-- Fix #16: Add missing updated_at triggers (safe idempotent approach)

DO $$
BEGIN
  -- disputes
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_disputes_updated_at') THEN
    CREATE TRIGGER update_disputes_updated_at
      BEFORE UPDATE ON public.disputes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- booking_groups
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_booking_groups_updated_at') THEN
    CREATE TRIGGER update_booking_groups_updated_at
      BEFORE UPDATE ON public.booking_groups
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- coupons
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_coupons_updated_at') THEN
    CREATE TRIGGER update_coupons_updated_at
      BEFORE UPDATE ON public.coupons
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- outgoing_emails
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_outgoing_emails_updated_at') THEN
    CREATE TRIGGER update_outgoing_emails_updated_at
      BEFORE UPDATE ON public.outgoing_emails
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;
