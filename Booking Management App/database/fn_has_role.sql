-- ============================================
-- FUNCTION: has_role
-- Description: Security definer function to check if user has a specific role
-- Purpose: Prevents infinite recursion in RLS policies
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- USAGE EXAMPLE
-- ============================================
-- Instead of querying user_roles directly in RLS policies:
-- 
-- WRONG (causes infinite recursion):
--   CREATE POLICY "Admin access"
--   ON some_table FOR SELECT
--   USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin');
--
-- CORRECT:
--   CREATE POLICY "Admin access"
--   ON some_table FOR SELECT
--   USING (public.has_role(auth.uid(), 'admin'));
