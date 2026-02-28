-- ============================================
-- TABLE: provider_availability
-- Description: Weekly availability schedules for providers
-- ============================================

CREATE TABLE public.provider_availability (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    slot_duration INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

-- Providers can manage their own availability
CREATE POLICY "Providers can view their own availability" ON public.provider_availability FOR SELECT USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Providers can insert their own availability" ON public.provider_availability FOR INSERT WITH CHECK (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Providers can update their own availability" ON public.provider_availability FOR UPDATE USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Providers can delete their own availability" ON public.provider_availability FOR DELETE USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));

-- Public can view active provider availability
CREATE POLICY "Public can view active provider availability" ON public.provider_availability FOR SELECT USING (is_active = true AND provider_id IN (SELECT id FROM provider_profiles WHERE is_approved = true AND is_active = true));
