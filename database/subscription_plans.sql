-- ============================================
-- TABLE: subscription_plans
-- Description: Available subscription plans
-- ============================================

CREATE TABLE public.subscription_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    appointments_included INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Admins can manage plans
CREATE POLICY "Admins can manage plans"
ON public.subscription_plans FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- SAMPLE DATA
-- ============================================
-- INSERT INTO public.subscription_plans (name, description, price, duration_days, appointments_included)
-- VALUES
--   ('Basic', 'Perfect for occasional users', 9.99, 30, 2),
--   ('Standard', 'Most popular choice', 19.99, 30, 5),
--   ('Premium', 'Best value for regular users', 29.99, 30, 10);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_subscription_plans_active ON public.subscription_plans(is_active) WHERE is_active = true;
