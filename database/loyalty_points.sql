-- ============================================
-- TABLE: loyalty_points
-- Description: User loyalty points balance
-- ============================================

CREATE TABLE public.loyalty_points (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    total_points INTEGER NOT NULL DEFAULT 0,
    lifetime_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TIER DEFINITIONS (in application code)
-- ============================================
-- Bronze: 0-999 points (1x multiplier)
-- Silver: 1,000-4,999 points (1.25x multiplier)
-- Gold: 5,000-9,999 points (1.5x multiplier)
-- Platinum: 10,000+ points (2x multiplier)

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their points
CREATE POLICY "Users can view their points"
ON public.loyalty_points FOR SELECT
USING (auth.uid() = user_id);

-- Service can manage points (for edge functions)
CREATE POLICY "Service can manage points"
ON public.loyalty_points FOR ALL
USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE UNIQUE INDEX idx_loyalty_points_user_id ON public.loyalty_points(user_id);
