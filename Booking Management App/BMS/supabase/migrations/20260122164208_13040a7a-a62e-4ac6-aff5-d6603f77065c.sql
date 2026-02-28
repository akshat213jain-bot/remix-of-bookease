-- Create provider availability schedule table
CREATE TABLE public.provider_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER NOT NULL DEFAULT 30, -- in minutes
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, day_of_week)
);

-- Create blocked dates table for providers to block specific dates
CREATE TABLE public.provider_blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, blocked_date)
);

-- Enable RLS
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_availability
CREATE POLICY "Providers can view their own availability"
  ON public.provider_availability FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert their own availability"
  ON public.provider_availability FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update their own availability"
  ON public.provider_availability FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete their own availability"
  ON public.provider_availability FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active provider availability"
  ON public.provider_availability FOR SELECT
  USING (
    is_active = true AND
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE is_approved = true AND is_active = true
    )
  );

-- RLS Policies for provider_blocked_dates
CREATE POLICY "Providers can view their own blocked dates"
  ON public.provider_blocked_dates FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert their own blocked dates"
  ON public.provider_blocked_dates FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete their own blocked dates"
  ON public.provider_blocked_dates FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view provider blocked dates"
  ON public.provider_blocked_dates FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE is_approved = true AND is_active = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();