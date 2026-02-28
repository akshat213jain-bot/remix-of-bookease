-- ============================================
-- TABLE: reviews
-- Description: User reviews for providers
-- ============================================

CREATE TABLE public.reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
    appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_visible BOOLEAN DEFAULT true,
    
    -- Provider response
    provider_response TEXT,
    provider_response_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Public can view visible reviews
CREATE POLICY "Public can view visible reviews"
ON public.reviews FOR SELECT
USING (is_visible = true);

-- Users can view their own reviews
CREATE POLICY "Users can view their own reviews"
ON public.reviews FOR SELECT
USING (auth.uid() = user_id);

-- Users can create reviews for their completed appointments
CREATE POLICY "Users can create reviews for their completed appointments"
ON public.reviews FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM appointments
        WHERE id = reviews.appointment_id
        AND user_id = auth.uid()
        AND status = 'completed'
    )
);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = user_id);

-- Providers can view reviews for their profile
CREATE POLICY "Providers can view reviews for their profile"
ON public.reviews FOR SELECT
USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- Providers can respond to reviews
CREATE POLICY "Providers can respond to reviews"
ON public.reviews FOR UPDATE
USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.reviews FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update any review
CREATE POLICY "Admins can update any review"
ON public.reviews FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE UNIQUE INDEX idx_reviews_appointment_id ON public.reviews(appointment_id);
