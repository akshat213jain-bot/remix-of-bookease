-- Create appointment status enum
CREATE TYPE public.appointment_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent double booking (same provider, date, time)
CREATE UNIQUE INDEX idx_unique_appointment_slot 
  ON public.appointments (provider_id, appointment_date, start_time) 
  WHERE status NOT IN ('cancelled', 'rejected');

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Users can view their own appointments
CREATE POLICY "Users can view their own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create appointments
CREATE POLICY "Users can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own appointments (cancel)
CREATE POLICY "Users can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = user_id);

-- Providers can view appointments for their profile
CREATE POLICY "Providers can view their appointments"
  ON public.appointments FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

-- Providers can update appointments (approve/reject/complete)
CREATE POLICY "Providers can update their appointments"
  ON public.appointments FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all appointments
CREATE POLICY "Admins can update all appointments"
  ON public.appointments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();