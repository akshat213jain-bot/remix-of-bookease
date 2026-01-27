-- ============================================
-- TABLE: loyalty_transactions
-- Description: Points earning and redemption history
-- ============================================

CREATE TABLE public.loyalty_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    related_appointment_id UUID REFERENCES public.appointments(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TRANSACTION TYPES
-- ============================================
-- - earn: Points earned from completed appointment
-- - redeem: Points redeemed for discount
-- - referral: Points from referral bonus
-- - bonus: Admin-granted bonus points
-- - expire: Points expired (if expiration is implemented)

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their transactions
CREATE POLICY "Users can view their transactions"
ON public.loyalty_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Service can manage transactions (for edge functions)
CREATE POLICY "Service can manage transactions"
ON public.loyalty_transactions FOR ALL
USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_created_at ON public.loyalty_transactions(created_at DESC);
CREATE INDEX idx_loyalty_transactions_type ON public.loyalty_transactions(transaction_type);
