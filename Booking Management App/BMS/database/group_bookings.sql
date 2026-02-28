-- =============================================
-- GROUP BOOKINGS
-- =============================================
-- Allow multiple users to book the same appointment together

-- Group bookings table
CREATE TABLE IF NOT EXISTS public.group_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  max_participants INTEGER NOT NULL DEFAULT 5,
  min_participants INTEGER DEFAULT 1,
  price_per_person NUMERIC,
  total_price NUMERIC,
  share_code TEXT UNIQUE, -- Unique code to share with friends
  is_public BOOLEAN DEFAULT false, -- Allow strangers to join
  booking_deadline TIMESTAMPTZ, -- Deadline to join
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Group booking participants
CREATE TABLE IF NOT EXISTS public.group_booking_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_booking_id UUID NOT NULL REFERENCES public.group_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  paid BOOLEAN DEFAULT false,
  payment_intent_id TEXT,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(group_booking_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_bookings_organizer ON public.group_bookings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_appointment ON public.group_bookings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_share_code ON public.group_bookings(share_code);
CREATE INDEX IF NOT EXISTS idx_group_participants_booking ON public.group_booking_participants(group_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_participants_user ON public.group_booking_participants(user_id);

-- Enable RLS
ALTER TABLE public.group_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_booking_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_bookings
CREATE POLICY "Organizers can manage their group bookings"
  ON public.group_bookings FOR ALL
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Participants can view group bookings they're in"
  ON public.group_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_booking_participants
      WHERE group_booking_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Public group bookings are viewable"
  ON public.group_bookings FOR SELECT
  USING (is_public = true AND status = 'open');

-- RLS Policies for participants
CREATE POLICY "Participants can view their own participation"
  ON public.group_booking_participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Organizers can manage participants"
  ON public.group_booking_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.group_bookings
      WHERE id = group_booking_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can join open groups"
  ON public.group_booking_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to generate share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate share code
CREATE OR REPLACE FUNCTION set_group_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := generate_share_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_booking_share_code_trigger
  BEFORE INSERT ON public.group_bookings
  FOR EACH ROW EXECUTE FUNCTION set_group_share_code();

-- Add is_group flag to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
