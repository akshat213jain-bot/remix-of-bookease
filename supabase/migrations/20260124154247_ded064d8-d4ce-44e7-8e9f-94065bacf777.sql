-- Update the handle_new_user function to always assign 'user' role initially
-- Admin role will be granted through the approval process
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;