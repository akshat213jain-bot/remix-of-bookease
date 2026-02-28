-- Video Waiting Room Status Column
-- Add video_status column to appointments table to track waiting room state

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'not_started';

-- Possible values:
-- 'not_started' - Default state, no one has joined
-- 'provider_ready' - Provider has created/joined the room
-- 'patient_waiting' - Patient is waiting to be admitted
-- 'admitted' - Provider has admitted the patient
-- 'in_call' - Both parties are in the call
-- 'ended' - Call has ended

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_video_status ON appointments(video_status);

-- Add comment for documentation
COMMENT ON COLUMN appointments.video_status IS 'Tracks the video consultation waiting room state';
