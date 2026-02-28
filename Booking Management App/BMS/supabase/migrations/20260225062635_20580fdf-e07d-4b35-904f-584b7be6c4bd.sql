
-- Fix Security Definer View warnings by setting security_invoker = true
-- This ensures views use the querying user's permissions, not the view creator's

CREATE OR REPLACE VIEW public.provider_public_info
WITH (security_invoker = true) AS
SELECT 
  p.user_id,
  p.full_name,
  p.avatar_url,
  p.city,
  p.country,
  pp.id as provider_id,
  pp.profession,
  pp.specialty,
  pp.bio,
  pp.location,
  pp.consultation_fee,
  pp.video_consultation_fee,
  pp.years_of_experience,
  pp.average_rating,
  pp.total_reviews,
  pp.is_verified,
  pp.video_enabled
FROM profiles p
JOIN provider_profiles pp ON p.user_id = pp.user_id
WHERE pp.is_approved = true AND pp.is_active = true;

CREATE OR REPLACE VIEW public.provider_profiles_public
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  profession,
  specialty,
  bio,
  location,
  consultation_fee,
  video_consultation_fee,
  years_of_experience,
  average_rating,
  total_reviews,
  is_verified,
  video_enabled,
  is_approved,
  is_active,
  buffer_time_before,
  buffer_time_after,
  require_video_payment,
  timezone,
  created_at
FROM provider_profiles
WHERE is_approved = true AND is_active = true;

CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = true) AS
SELECT 
  id,
  provider_id,
  rating,
  review_text,
  provider_response,
  provider_response_at,
  created_at,
  is_visible
FROM reviews
WHERE is_visible = true;
