-- ============================================
-- TABLE: user_subscriptions
-- Description: User subscription records
-- ============================================

CREATE TABLE public.user_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    appointments_remaining INTEGER NOT NULL DEFAULT 0,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STATUS VALUES
-- ============================================
-- - active: Subscription is active
-- - cancelled: User cancelled but still valid until expires_at
-- - expired: Subscription period ended
-- - paused: Subscription temporarily paused

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their subscriptions
CREATE POLICY "Users can view their subscriptions"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage subscriptions
CREATE POLICY "Admins can manage subscriptions"
ON public.user_subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires ON public.user_subscriptions(expires_at);
