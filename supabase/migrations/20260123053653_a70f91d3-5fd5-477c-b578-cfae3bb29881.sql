-- Create reviews table for rating and review system
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_visible BOOLEAN DEFAULT true,
  provider_response TEXT,
  provider_response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

-- Add average rating to provider_profiles for quick access
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Users can create reviews for their completed appointments"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = appointment_id
    AND user_id = auth.uid()
    AND status = 'completed'
  )
);

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reviews"
ON public.reviews
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Providers can view reviews for their profile"
ON public.reviews
FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM public.provider_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can respond to reviews"
ON public.reviews
FOR UPDATE
USING (
  provider_id IN (
    SELECT id FROM public.provider_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Public can view visible reviews"
ON public.reviews
FOR SELECT
USING (is_visible = true);

CREATE POLICY "Admins can view all reviews"
ON public.reviews
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any review"
ON public.reviews
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_appointment_id ON public.reviews(appointment_id);

-- Create function to update provider average rating
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.provider_profiles
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
      AND is_visible = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
      AND is_visible = true
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for rating updates
CREATE TRIGGER update_provider_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_provider_rating();

-- Add trigger for updated_at on reviews
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();