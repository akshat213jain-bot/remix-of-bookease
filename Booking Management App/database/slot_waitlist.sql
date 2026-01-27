-- ============================================
-- TABLE: slot_waitlist  
-- Description: Waitlist for specific time slots
-- ============================================

CREATE TABLE public.slot_waitlist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
    preferred_date DATE,
    preferred_day_of_week INTEGER,
    preferred_start_time TIME WITHOUT TIME ZONE,
    preferred_end_time TIME WITHOUT TIME ZONE,
    is_flexible BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.slot_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waitlist entries" ON public.slot_waitlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own waitlist entries" ON public.slot_waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own waitlist entries" ON public.slot_waitlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own waitlist entries" ON public.slot_waitlist FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Providers can view their waitlist" ON public.slot_waitlist FOR SELECT USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));
