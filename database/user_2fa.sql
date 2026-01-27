-- =============================================
-- TWO-FACTOR AUTHENTICATION (2FA)
-- =============================================
-- Supports TOTP (Time-based One-Time Password) authentication

-- 2FA settings table
CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  is_enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[], -- Hashed backup codes
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2FA verification attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.two_fa_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON public.user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_user ON public.two_fa_attempts(user_id, attempted_at);

-- Enable RLS
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_fa_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own 2FA settings"
  ON public.user_2fa FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings"
  ON public.user_2fa FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings"
  ON public.user_2fa FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own 2FA settings"
  ON public.user_2fa FOR DELETE
  USING (auth.uid() = user_id);

-- Rate limiting function for 2FA attempts
CREATE OR REPLACE FUNCTION check_2fa_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_failed_attempts INTEGER;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_failed_attempts
  FROM public.two_fa_attempts
  WHERE user_id = p_user_id
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  -- Allow if less than 5 failed attempts
  RETURN v_failed_attempts < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add 2FA flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT false;
