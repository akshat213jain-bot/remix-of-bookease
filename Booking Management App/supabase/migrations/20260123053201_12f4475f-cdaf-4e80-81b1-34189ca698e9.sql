-- Create waitlist table for cancelled slot notifications
CREATE TABLE public.slot_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  preferred_date DATE,
  preferred_day_of_week INTEGER CHECK (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6),
  preferred_start_time TIME,
  preferred_end_time TIME,
  is_flexible BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slot_waitlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own waitlist entries
CREATE POLICY "Users can view their own waitlist entries"
ON public.slot_waitlist FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own waitlist entries
CREATE POLICY "Users can create their own waitlist entries"
ON public.slot_waitlist FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own waitlist entries
CREATE POLICY "Users can update their own waitlist entries"
ON public.slot_waitlist FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own waitlist entries
CREATE POLICY "Users can delete their own waitlist entries"
ON public.slot_waitlist FOR DELETE
USING (auth.uid() = user_id);

-- Providers can view waitlist for their profile
CREATE POLICY "Providers can view their waitlist"
ON public.slot_waitlist FOR SELECT
USING (provider_id IN (
  SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- Add Stripe Connect fields to provider_profiles
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Index for efficient waitlist queries
CREATE INDEX IF NOT EXISTS idx_waitlist_provider_date ON public.slot_waitlist(provider_id, preferred_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_waitlist_provider_day ON public.slot_waitlist(provider_id, preferred_day_of_week) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_slot_waitlist_updated_at
BEFORE UPDATE ON public.slot_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();