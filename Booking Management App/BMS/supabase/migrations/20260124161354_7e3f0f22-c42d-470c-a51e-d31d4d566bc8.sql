-- Allow admins to create provider profiles (needed when switching a user to provider)
CREATE POLICY "Admins can insert any provider profile"
ON public.provider_profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
