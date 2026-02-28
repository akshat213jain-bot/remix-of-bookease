-- Add recurring appointment fields
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('none', 'weekly', 'biweekly', 'monthly')),
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_recurring_parent BOOLEAN DEFAULT false;

-- Update recurrence_pattern to default to 'none' for existing rows
UPDATE public.appointments SET recurrence_pattern = 'none' WHERE recurrence_pattern IS NULL;

-- Create index for efficient recurring appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_parent ON public.appointments(parent_appointment_id) WHERE parent_appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_recurring ON public.appointments(is_recurring_parent) WHERE is_recurring_parent = true;