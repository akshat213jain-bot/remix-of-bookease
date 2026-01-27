-- ============================================
-- TABLE: referrals
-- Description: Referral tracking between users
-- ============================================

CREATE TABLE public.referrals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL,
    referred_id UUID NOT NULL,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    bonus_awarded BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE (referred_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STATUS VALUES
-- ============================================
-- - pending: Referred user signed up but hasn't completed action
-- - completed: Referred user completed qualifying action (e.g., first booking)
-- - rewarded: Both referrer and referred received bonuses

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their referrals (as referrer or referred)
CREATE POLICY "Users can view their referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Users can create referrals
CREATE POLICY "Users can create referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

-- Service can update referrals
CREATE POLICY "Service can update referrals"
ON public.referrals FOR UPDATE
USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE UNIQUE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
