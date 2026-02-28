-- ============================================
-- FUNCTION: get_user_role
-- Description: Returns the highest priority role for a user
-- Priority: admin > provider > user
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'provider' THEN 2 
      WHEN 'user' THEN 3 
    END
  LIMIT 1
$$;

-- ============================================
-- USAGE EXAMPLE
-- ============================================
-- Get user's primary role:
--   SELECT public.get_user_role(auth.uid());
--
-- Use in application logic:
--   const { data } = await supabase.rpc('get_user_role', { _user_id: userId });
