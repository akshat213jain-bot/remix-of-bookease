-- Add require_video_payment column to provider_profiles
ALTER TABLE public.provider_profiles
ADD COLUMN require_video_payment boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.provider_profiles.require_video_payment IS 'When false, users can join video consultations without payment regardless of fee amount';