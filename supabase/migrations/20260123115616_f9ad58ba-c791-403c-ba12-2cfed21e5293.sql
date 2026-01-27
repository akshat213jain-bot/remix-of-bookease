-- Add new fields to profiles table for users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Add new fields to provider_profiles table
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Create index for phone verification lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verification 
ON public.profiles(phone, phone_verification_code) 
WHERE phone_verification_code IS NOT NULL;