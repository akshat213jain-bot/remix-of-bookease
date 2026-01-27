-- Add video consultation support to provider_profiles
ALTER TABLE public.provider_profiles 
ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_consultation_fee NUMERIC(10,2);

-- Add video meeting fields to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS is_video_consultation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meeting_url TEXT,
ADD COLUMN IF NOT EXISTS meeting_room_name TEXT;

-- Add provider reschedule request fields to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS reschedule_requested_by TEXT CHECK (reschedule_requested_by IN ('user', 'provider')),
ADD COLUMN IF NOT EXISTS proposed_date DATE,
ADD COLUMN IF NOT EXISTS proposed_start_time TIME,
ADD COLUMN IF NOT EXISTS proposed_end_time TIME,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;

-- Create index for video consultations
CREATE INDEX IF NOT EXISTS idx_appointments_video ON public.appointments(is_video_consultation) WHERE is_video_consultation = true;

-- Create index for reschedule requests
CREATE INDEX IF NOT EXISTS idx_appointments_reschedule ON public.appointments(reschedule_requested_by) WHERE reschedule_requested_by IS NOT NULL;