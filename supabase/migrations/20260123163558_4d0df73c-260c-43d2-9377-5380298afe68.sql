-- Allow public read access to basic profile info for users who are providers
CREATE POLICY "Public can view provider basic info"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT pp.user_id 
    FROM public.provider_profiles pp 
    WHERE pp.is_approved = true AND pp.is_active = true
  )
);