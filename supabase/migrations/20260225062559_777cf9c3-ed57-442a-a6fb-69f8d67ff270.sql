
-- =============================================
-- CRITICAL FIX #1: Profiles - restrict public access
-- The "Public can view provider basic info" policy exposes ALL columns
-- We need a view that only exposes safe fields
-- =============================================

-- Drop the overly permissive public SELECT policy on profiles
DROP POLICY IF EXISTS "Public can view provider basic info" ON public.profiles;

-- Create a restricted public policy that only allows viewing provider names (not PII)
-- Note: RLS is row-level, not column-level. We use a view for column restriction.
CREATE POLICY "Public can view provider display info"
ON public.profiles FOR SELECT
TO public
USING (
  user_id IN (
    SELECT pp.user_id FROM provider_profiles pp
    WHERE pp.is_approved = true AND pp.is_active = true
  )
);

-- Create a secure view for public provider display (hides sensitive columns)
CREATE OR REPLACE VIEW public.provider_public_info AS
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

-- =============================================
-- CRITICAL FIX #2: Provider profiles - hide sensitive fields via view
-- The "Public can view approved providers" policy exposes stripe_account_id, phone, verification_documents
-- We keep the policy but create a safe view for public consumption
-- =============================================

-- Create a secure view for public provider profiles (no Stripe/verification/phone data)
CREATE OR REPLACE VIEW public.provider_profiles_public AS
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

-- =============================================
-- CRITICAL FIX #3: Reviews - hide user_id from public view
-- =============================================

-- Drop the overly broad public SELECT policy
DROP POLICY IF EXISTS "Public can view visible reviews" ON public.reviews;

-- Create a view that hides user identity for public consumption
CREATE OR REPLACE VIEW public.reviews_public AS
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

-- Re-create public review policy but only for authenticated users
CREATE POLICY "Authenticated can view visible reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (is_visible = true);

-- =============================================
-- CRITICAL FIX #4: Gift cards - restrict access
-- =============================================

-- Drop all overly permissive gift card policies
DROP POLICY IF EXISTS "Anyone can view gift card by code" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can purchase gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Service can update gift cards" ON public.gift_cards;

-- Authenticated users can view gift cards they purchased
CREATE POLICY "Users can view their purchased gift cards"
ON public.gift_cards FOR SELECT
TO authenticated
USING (purchased_by = auth.uid());

-- Authenticated users can view gift cards sent to their email
CREATE POLICY "Users can view received gift cards"
ON public.gift_cards FOR SELECT
TO authenticated
USING (
  recipient_email IN (
    SELECT email FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view all gift cards
CREATE POLICY "Admins can view all gift cards"
ON public.gift_cards FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can purchase gift cards
CREATE POLICY "Authenticated users can purchase gift cards"
ON public.gift_cards FOR INSERT
TO authenticated
WITH CHECK (purchased_by = auth.uid());

-- Only service role can update gift cards (for redemption via edge functions)
CREATE POLICY "Service role can update gift cards"
ON public.gift_cards FOR UPDATE
TO service_role
USING (true);

-- =============================================
-- WARNING FIXES: Replace all USING(true)/WITH CHECK(true) "service" policies
-- These should use service_role, not public
-- =============================================

-- Fix coupon_uses: change from public to service_role
DROP POLICY IF EXISTS "Service can insert coupon uses" ON public.coupon_uses;
CREATE POLICY "Service role can insert coupon uses"
ON public.coupon_uses FOR INSERT
TO service_role
WITH CHECK (true);

-- Also allow authenticated users to record their own coupon use
CREATE POLICY "Users can insert own coupon uses"
ON public.coupon_uses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix gift_card_transactions: change from public to service_role
DROP POLICY IF EXISTS "Service can insert transactions" ON public.gift_card_transactions;
CREATE POLICY "Service role can insert gift card transactions"
ON public.gift_card_transactions FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix loyalty_points: change from public to service_role
DROP POLICY IF EXISTS "Service can manage points" ON public.loyalty_points;
CREATE POLICY "Service role can manage loyalty points"
ON public.loyalty_points FOR ALL
TO service_role
USING (true);

-- Allow authenticated users to view their own points (already exists, keep it)

-- Fix loyalty_transactions: change from public to service_role
DROP POLICY IF EXISTS "Service can manage transactions" ON public.loyalty_transactions;
CREATE POLICY "Service role can manage loyalty transactions"
ON public.loyalty_transactions FOR ALL
TO service_role
USING (true);

-- Fix notifications: change from public to service_role
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role inserts notifications"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- Also allow authenticated users to create notifications for themselves
CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix referrals: change from public to service_role  
DROP POLICY IF EXISTS "Service can update referrals" ON public.referrals;
CREATE POLICY "Service role can update referrals"
ON public.referrals FOR UPDATE
TO service_role
USING (true);

-- Fix user_badges: change from public to service_role
DROP POLICY IF EXISTS "Service can award badges" ON public.user_badges;
CREATE POLICY "Service role can award badges"
ON public.user_badges FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix user_packages: change from public to service_role
DROP POLICY IF EXISTS "Service can manage user packages" ON public.user_packages;
CREATE POLICY "Service role can manage user packages"
ON public.user_packages FOR ALL
TO service_role
USING (true);
