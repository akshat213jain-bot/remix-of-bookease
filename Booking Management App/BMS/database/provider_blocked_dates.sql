-- ============================================
-- TABLE: provider_blocked_dates
-- Description: Dates when providers are unavailable
-- ============================================

CREATE TABLE public.provider_blocked_dates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_blocked_dates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY "Providers can view their own blocked dates" ON public.provider_blocked_dates
  FOR SELECT USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert their own blocked dates" ON public.provider_blocked_dates
  FOR INSERT WITH CHECK (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can delete their own blocked dates" ON public.provider_blocked_dates
  FOR DELETE USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can view provider blocked dates" ON public.provider_blocked_dates
  FOR SELECT USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE is_approved = true AND is_active = true
  ));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_blocked_dates_provider ON public.provider_blocked_dates(provider_id);
CREATE INDEX idx_blocked_dates_date ON public.provider_blocked_dates(blocked_date);
CREATE UNIQUE INDEX idx_blocked_dates_unique ON public.provider_blocked_dates(provider_id, blocked_date);
