-- ============================================
-- TABLE: profiles
-- Description: User profiles with contact info, verification, and preferences
-- ============================================

CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    
    -- Contact info
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    date_of_birth DATE,
    avatar_url TEXT,
    
    -- Phone verification
    phone_verified BOOLEAN DEFAULT false,
    phone_verification_code TEXT,
    phone_verification_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- SMS Notifications
    sms_notifications_enabled BOOLEAN DEFAULT false,
    
    -- Account status
    status TEXT NOT NULL DEFAULT 'active',
    status_reason TEXT,
    status_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Referral system
    referral_code TEXT UNIQUE,
    
    -- User preferences (i18n & timezone support)
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Public can view provider basic info (for provider listings)
CREATE POLICY "Public can view provider basic info"
ON public.profiles FOR SELECT
USING (user_id IN (
    SELECT pp.user_id FROM provider_profiles pp
    WHERE pp.is_approved = true AND pp.is_active = true
));

-- ============================================
-- INDEXES
-- ============================================

CREATE UNIQUE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE UNIQUE INDEX idx_profiles_referral_code ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;
