-- =============================================
-- RECURRING BOOKINGS
-- =============================================
-- Supports automatic scheduling of weekly/biweekly/monthly appointments

-- Recurring bookings table
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31), -- For monthly
  time_slot TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  start_date DATE NOT NULL,
  end_date DATE, -- null for indefinite
  next_appointment_date DATE,
  total_appointments_created INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link recurring bookings to generated appointments
CREATE TABLE IF NOT EXISTS public.recurring_appointment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_booking_id UUID NOT NULL REFERENCES public.recurring_bookings(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recurring_booking_id, appointment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_user ON public.recurring_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_provider ON public.recurring_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_active ON public.recurring_bookings(is_active, next_appointment_date);
CREATE INDEX IF NOT EXISTS idx_recurring_links_recurring ON public.recurring_appointment_links(recurring_booking_id);
CREATE INDEX IF NOT EXISTS idx_recurring_links_appointment ON public.recurring_appointment_links(appointment_id);

-- Enable RLS
ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_appointment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recurring bookings"
  ON public.recurring_bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = provider_id);

CREATE POLICY "Users can create their own recurring bookings"
  ON public.recurring_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring bookings"
  ON public.recurring_bookings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring bookings"
  ON public.recurring_bookings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view links for their recurring bookings"
  ON public.recurring_appointment_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recurring_bookings rb
      WHERE rb.id = recurring_booking_id
      AND (rb.user_id = auth.uid() OR rb.provider_id = auth.uid())
    )
  );

-- Function to calculate next appointment date
CREATE OR REPLACE FUNCTION calculate_next_appointment_date(
  p_frequency TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_current_date DATE
)
RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
BEGIN
  IF p_frequency = 'weekly' THEN
    -- Find next occurrence of day_of_week
    v_next_date := p_current_date + ((7 + p_day_of_week - EXTRACT(DOW FROM p_current_date)::INTEGER) % 7 + 7);
    IF v_next_date = p_current_date THEN
      v_next_date := v_next_date + 7;
    END IF;
    
  ELSIF p_frequency = 'biweekly' THEN
    v_next_date := p_current_date + ((7 + p_day_of_week - EXTRACT(DOW FROM p_current_date)::INTEGER) % 7 + 14);
    
  ELSIF p_frequency = 'monthly' THEN
    -- Find next occurrence of day_of_month
    v_next_date := DATE_TRUNC('month', p_current_date) + (p_day_of_month - 1) * INTERVAL '1 day';
    IF v_next_date <= p_current_date THEN
      v_next_date := DATE_TRUNC('month', p_current_date + INTERVAL '1 month') + (p_day_of_month - 1) * INTERVAL '1 day';
    END IF;
  END IF;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next recurring appointment
CREATE OR REPLACE FUNCTION generate_recurring_appointment(p_recurring_id UUID)
RETURNS UUID AS $$
DECLARE
  v_recurring RECORD;
  v_appointment_id UUID;
  v_appointment_date DATE;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  -- Get recurring booking details
  SELECT * INTO v_recurring
  FROM public.recurring_bookings
  WHERE id = p_recurring_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check if end date passed
  IF v_recurring.end_date IS NOT NULL AND v_recurring.next_appointment_date > v_recurring.end_date THEN
    UPDATE public.recurring_bookings SET is_active = false WHERE id = p_recurring_id;
    RETURN NULL;
  END IF;

  v_appointment_date := v_recurring.next_appointment_date;
  v_start_time := v_appointment_date + v_recurring.time_slot;
  v_end_time := v_start_time + (v_recurring.duration_minutes || ' minutes')::INTERVAL;

  -- Create appointment
  INSERT INTO public.appointments (
    user_id, provider_id, service_id, 
    start_time, end_time, status, notes,
    is_recurring
  )
  VALUES (
    v_recurring.user_id, v_recurring.provider_id, v_recurring.service_id,
    v_start_time, v_end_time, 'pending', v_recurring.notes,
    true
  )
  RETURNING id INTO v_appointment_id;

  -- Link to recurring booking
  INSERT INTO public.recurring_appointment_links (recurring_booking_id, appointment_id, scheduled_date)
  VALUES (p_recurring_id, v_appointment_id, v_appointment_date);

  -- Update next appointment date
  UPDATE public.recurring_bookings
  SET 
    next_appointment_date = calculate_next_appointment_date(
      v_recurring.frequency, 
      v_recurring.day_of_week, 
      v_recurring.day_of_month, 
      v_appointment_date
    ),
    total_appointments_created = total_appointments_created + 1,
    updated_at = now()
  WHERE id = p_recurring_id;

  RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_recurring flag to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
