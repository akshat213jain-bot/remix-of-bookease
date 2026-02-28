-- ============================================
-- FUNCTION: update_updated_at_column
-- Description: Generic trigger function to auto-update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- USAGE EXAMPLE
-- ============================================
-- Apply to any table with an updated_at column:
--
-- CREATE TRIGGER update_profiles_updated_at
--   BEFORE UPDATE ON public.profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TABLES USING THIS TRIGGER
-- ============================================
-- - profiles
-- - provider_profiles
-- - appointments
-- - provider_availability
-- - reviews
-- - chat_conversations
-- - subscription_plans
-- - user_subscriptions
-- - loyalty_points
-- - slot_waitlist
-- - approval_requests
-- - email_templates
-- - system_settings
-- - outgoing_emails
