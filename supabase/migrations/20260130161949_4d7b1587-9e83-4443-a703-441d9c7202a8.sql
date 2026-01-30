-- Add payment_method column to appointments table
ALTER TABLE public.appointments
ADD COLUMN payment_method text;