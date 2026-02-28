-- ============================================
-- FUNCTION: handle_new_user
-- Description: Trigger function for new user setup
-- Called automatically when a new user signs up via Supabase Auth
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  -- Get the requested role from metadata
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- For admin signups, always start with 'user' role - admin role granted after approval
  -- For provider signups, start with 'user' role - provider role granted after approval
  -- Only 'user' role is assigned directly
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    'user'::public.app_role
  );
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER
-- ============================================

-- This trigger is created on auth.users table (managed by Supabase)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- NOTES
-- ============================================
-- - All new users start with 'user' role regardless of metadata
-- - Admin/provider roles must be granted separately through approval process
-- - This prevents privilege escalation via signup metadata
