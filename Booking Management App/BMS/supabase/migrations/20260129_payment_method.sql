-- Add payment_method column to appointments table
-- Allowed values: 'cash', 'upi', 'card', 'stripe'
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create index for payment method queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON public.appointments(payment_method);

-- Add comment for documentation
COMMENT ON COLUMN public.appointments.payment_method IS 'Payment method used: cash, upi, card, stripe';
