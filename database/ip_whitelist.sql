-- =============================================
-- IP WHITELISTING FOR ADMINS
-- =============================================
-- Restrict admin access by IP address

-- IP whitelist entries
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  ip_range CIDR, -- For subnet whitelisting
  label TEXT, -- "Office", "Home", etc.
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Optional expiration
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, ip_address)
);

-- IP access logs
CREATE TABLE IF NOT EXISTS public.ip_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login_allowed', 'login_blocked', 'api_allowed', 'api_blocked')),
  user_agent TEXT,
  endpoint TEXT,
  country_code TEXT,
  city TEXT,
  is_vpn BOOLEAN DEFAULT false,
  is_tor BOOLEAN DEFAULT false,
  risk_score INTEGER, -- 0-100
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- IP security settings per user
CREATE TABLE IF NOT EXISTS public.ip_security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  whitelist_enabled BOOLEAN DEFAULT false,
  block_vpn BOOLEAN DEFAULT false,
  block_tor BOOLEAN DEFAULT true,
  max_countries INTEGER DEFAULT 5, -- Max different countries allowed
  notify_on_new_ip BOOLEAN DEFAULT true,
  require_approval_new_ip BOOLEAN DEFAULT false,
  auto_whitelist_on_2fa BOOLEAN DEFAULT true,
  session_ip_lock BOOLEAN DEFAULT false, -- Lock session to IP
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Suspicious IP reports
CREATE TABLE IF NOT EXISTS public.suspicious_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  threat_type TEXT, -- 'brute_force', 'credential_stuffing', 'bot', etc.
  threat_score INTEGER DEFAULT 0, -- 0-100
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  blocked_count INTEGER DEFAULT 0,
  reported_by_users INTEGER DEFAULT 0,
  is_globally_blocked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_user ON public.ip_whitelist(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip ON public.ip_whitelist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_access_logs_user ON public.ip_access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_access_logs_ip ON public.ip_access_logs(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_ips ON public.suspicious_ips(ip_address);

-- Enable RLS
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_ips ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their IP whitelist"
  ON public.ip_whitelist FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their access logs"
  ON public.ip_access_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their security settings"
  ON public.ip_security_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check if IP is allowed
CREATE OR REPLACE FUNCTION is_ip_allowed(
  p_user_id UUID,
  p_ip_address INET
)
RETURNS JSONB AS $$
DECLARE
  v_settings RECORD;
  v_is_whitelisted BOOLEAN;
  v_is_blocked BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get user's security settings
  SELECT * INTO v_settings
  FROM public.ip_security_settings
  WHERE user_id = p_user_id;

  -- If no settings or whitelist disabled, allow
  IF NOT FOUND OR NOT v_settings.whitelist_enabled THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'whitelist_disabled');
  END IF;

  -- Check global blocklist
  SELECT EXISTS (
    SELECT 1 FROM public.suspicious_ips
    WHERE ip_address = p_ip_address AND is_globally_blocked = true
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'globally_blocked');
  END IF;

  -- Check whitelist
  SELECT EXISTS (
    SELECT 1 FROM public.ip_whitelist
    WHERE user_id = p_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (ip_address = p_ip_address OR p_ip_address << ip_range)
  ) INTO v_is_whitelisted;

  IF v_is_whitelisted THEN
    -- Update last used
    UPDATE public.ip_whitelist
    SET last_used_at = now()
    WHERE user_id = p_user_id AND ip_address = p_ip_address;

    RETURN jsonb_build_object('allowed', true, 'reason', 'whitelisted');
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_whitelisted');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add IP to whitelist
CREATE OR REPLACE FUNCTION add_ip_to_whitelist(
  p_user_id UUID,
  p_ip_address INET,
  p_label TEXT DEFAULT NULL,
  p_expires_days INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_whitelist_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_expires_days IS NOT NULL THEN
    v_expires_at := now() + (p_expires_days || ' days')::INTERVAL;
  END IF;

  INSERT INTO public.ip_whitelist (user_id, ip_address, label, expires_at, created_by)
  VALUES (p_user_id, p_ip_address, p_label, v_expires_at, auth.uid())
  ON CONFLICT (user_id, ip_address) DO UPDATE SET
    is_active = true,
    label = COALESCE(p_label, ip_whitelist.label),
    expires_at = v_expires_at,
    last_used_at = now()
  RETURNING id INTO v_whitelist_id;

  RETURN v_whitelist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log IP access
CREATE OR REPLACE FUNCTION log_ip_access(
  p_user_id UUID,
  p_ip_address INET,
  p_action TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.ip_access_logs (user_id, ip_address, action, user_agent, endpoint)
  VALUES (p_user_id, p_ip_address, p_action, p_user_agent, p_endpoint)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
