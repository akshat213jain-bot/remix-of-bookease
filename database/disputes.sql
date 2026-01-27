-- ============================================
-- TABLE: disputes
-- Description: User disputes/complaints about appointments (Trust & Safety)
-- ============================================

CREATE TABLE public.disputes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
    
    -- Dispute details
    dispute_type TEXT NOT NULL, -- 'billing', 'service', 'no_show', 'misconduct', 'scheduling', 'other'
    description TEXT NOT NULL,
    
    -- Resolution workflow
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    resolution TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their own disputes
CREATE POLICY "Users can view their disputes"
ON public.disputes FOR SELECT
USING (auth.uid() = user_id);

-- Users can create disputes for their appointments
CREATE POLICY "Users can create disputes"
ON public.disputes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Providers can view disputes filed against them
CREATE POLICY "Providers can view their disputes"
ON public.disputes FOR SELECT
USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- Admins can manage all disputes
CREATE POLICY "Admins can manage all disputes"
ON public.disputes FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_disputes_appointment ON public.disputes(appointment_id);
CREATE INDEX idx_disputes_user ON public.disputes(user_id);
CREATE INDEX idx_disputes_provider ON public.disputes(provider_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
