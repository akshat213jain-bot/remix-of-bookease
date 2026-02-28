-- ============================================
-- TABLE: appointments
-- Description: Main appointments/bookings table with group booking support
-- ============================================

CREATE TABLE public.appointments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
    appointment_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    status appointment_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    cancellation_reason TEXT,
    
    -- Group booking reference
    booking_group_id UUID REFERENCES public.booking_groups(id),
    
    -- Payment fields
    payment_amount INTEGER,
    payment_status TEXT DEFAULT 'unpaid',
    payment_date TIMESTAMP WITH TIME ZONE,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Video consultation
    is_video_consultation BOOLEAN DEFAULT false,
    meeting_url TEXT,
    meeting_room_name TEXT,
    
    -- Reschedule request fields
    reschedule_requested_by TEXT,
    reschedule_reason TEXT,
    proposed_date DATE,
    proposed_start_time TIME WITHOUT TIME ZONE,
    proposed_end_time TIME WITHOUT TIME ZONE,
    
    -- Recurring appointment fields
    is_recurring_parent BOOLEAN DEFAULT false,
    parent_appointment_id UUID REFERENCES public.appointments(id),
    recurrence_pattern TEXT,
    recurrence_end_date DATE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their own appointments
CREATE POLICY "Users can view their own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = user_id);

-- Providers can view their appointments
CREATE POLICY "Providers can view their appointments"
ON public.appointments FOR SELECT
USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments"
ON public.appointments FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can create appointments
CREATE POLICY "Users can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own appointments
CREATE POLICY "Users can update their own appointments"
ON public.appointments FOR UPDATE
USING (auth.uid() = user_id);

-- Providers can update their appointments
CREATE POLICY "Providers can update their appointments"
ON public.appointments FOR UPDATE
USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- Admins can update all appointments
CREATE POLICY "Admins can update all appointments"
ON public.appointments FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX idx_appointments_provider_id ON public.appointments(provider_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_booking_group ON public.appointments(booking_group_id) WHERE booking_group_id IS NOT NULL;
