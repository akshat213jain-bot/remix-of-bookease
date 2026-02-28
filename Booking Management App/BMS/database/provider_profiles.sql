-- ============================================
-- TABLE: provider_profiles
-- Description: Provider-specific profiles with profession, fees, ratings, and verification
-- ============================================

CREATE TABLE public.provider_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    
    -- Professional info
    profession TEXT NOT NULL,
    specialty TEXT,
    bio TEXT,
    location TEXT,
    years_of_experience INTEGER DEFAULT 0,
    
    -- Contact
    phone TEXT,
    phone_verified BOOLEAN DEFAULT false,
    sms_notifications_enabled BOOLEAN DEFAULT false,
    
    -- Pricing
    consultation_fee NUMERIC DEFAULT 0,
    video_consultation_fee NUMERIC,
    video_enabled BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    
    -- Verification (Trust & Safety)
    is_verified BOOLEAN DEFAULT false,
    verification_type TEXT, -- 'identity', 'professional', 'background_check'
    verification_documents TEXT[],
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Scheduling (Buffer time settings)
    buffer_time_before INTEGER DEFAULT 0, -- minutes before appointment
    buffer_time_after INTEGER DEFAULT 15, -- minutes after appointment
    timezone TEXT DEFAULT 'UTC',
    
    -- Ratings
    average_rating NUMERIC,
    total_reviews INTEGER DEFAULT 0,
    
    -- Stripe Connect
    stripe_account_id TEXT,
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    stripe_charges_enabled BOOLEAN DEFAULT false,
    stripe_payouts_enabled BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Public can view approved providers
CREATE POLICY "Public can view approved providers"
ON public.provider_profiles FOR SELECT
USING (is_approved = true AND is_active = true);

-- Providers can view their own profile
CREATE POLICY "Providers can view their own profile"
ON public.provider_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Providers can insert their own profile
CREATE POLICY "Providers can insert their own profile"
ON public.provider_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Providers can update their own profile
CREATE POLICY "Providers can update their own profile"
ON public.provider_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all provider profiles
CREATE POLICY "Admins can view all provider profiles"
ON public.provider_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update any provider profile
CREATE POLICY "Admins can update any provider profile"
ON public.provider_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert any provider profile
CREATE POLICY "Admins can insert any provider profile"
ON public.provider_profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================

CREATE UNIQUE INDEX idx_provider_profiles_user_id ON public.provider_profiles(user_id);
CREATE INDEX idx_provider_profiles_profession ON public.provider_profiles(profession);
CREATE INDEX idx_provider_profiles_approved ON public.provider_profiles(is_approved) WHERE is_approved = true;
CREATE INDEX idx_provider_profiles_verified ON public.provider_profiles(is_verified) WHERE is_verified = true;
