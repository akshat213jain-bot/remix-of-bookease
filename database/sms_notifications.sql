-- =============================================
-- SMS NOTIFICATIONS
-- =============================================
-- Supports SMS notifications via Twilio

-- Add phone fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false;

-- SMS logs table
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'reminder', 'verification', 'notification', 'marketing'
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  provider TEXT DEFAULT 'twilio',
  external_id TEXT, -- Twilio message SID
  error_message TEXT,
  cost NUMERIC,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phone verification codes
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON public.sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON public.sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_phone_verification_user ON public.phone_verification_codes(user_id, expires_at);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_logs
CREATE POLICY "Users can view their own SMS logs"
  ON public.sms_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all SMS logs"
  ON public.sms_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for phone_verification_codes
CREATE POLICY "Users can view their own verification codes"
  ON public.phone_verification_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes"
  ON public.phone_verification_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to check SMS rate limit
CREATE OR REPLACE FUNCTION check_sms_rate_limit(p_phone_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Limit to 5 SMS per phone number per hour
  SELECT COUNT(*) INTO v_count
  FROM public.sms_logs
  WHERE phone_number = p_phone_number
    AND created_at > now() - interval '1 hour';

  RETURN v_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify phone number
CREATE OR REPLACE FUNCTION verify_phone_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record
  FROM public.phone_verification_codes
  WHERE user_id = p_user_id
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check attempts
  IF v_record.attempts >= 3 THEN
    RETURN false;
  END IF;

  -- Increment attempts
  UPDATE public.phone_verification_codes
  SET attempts = attempts + 1
  WHERE id = v_record.id;

  -- Verify code
  IF v_record.code = p_code THEN
    UPDATE public.phone_verification_codes
    SET verified = true
    WHERE id = v_record.id;

    UPDATE public.profiles
    SET phone_number = v_record.phone_number,
        phone_verified = true
    WHERE user_id = p_user_id;

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
