-- =============================================
-- PCI DSS & SECURITY COMPLIANCE
-- =============================================
-- Security headers, failed logins, and payment security

-- Security events log
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success', 'login_failure', 'logout',
    'password_change', 'password_reset', 'mfa_enabled', 'mfa_disabled',
    'payment_initiated', 'payment_completed', 'payment_failed',
    'suspicious_activity', 'blocked_request', 'rate_limited',
    'session_hijack_attempt', 'xss_attempt', 'sql_injection_attempt'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- email or username
  ip_address INET NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  locked_until TIMESTAMPTZ,
  user_agent TEXT
);

-- Content Security Policy violations
CREATE TABLE IF NOT EXISTS public.csp_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_uri TEXT,
  violated_directive TEXT,
  blocked_uri TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment security log (never stores card data!)
CREATE TABLE IF NOT EXISTS public.payment_security_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('checkout_started', 'card_validated', 'payment_submitted', 'payment_confirmed', 'refund_requested')),
  payment_method_type TEXT, -- 'card', 'bank', 'wallet' - NEVER the actual card number
  stripe_payment_intent_id TEXT, -- Reference only
  amount NUMERIC,
  currency TEXT DEFAULT 'usd',
  ip_address INET,
  device_fingerprint TEXT,
  risk_score INTEGER, -- Stripe Radar score
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security headers configuration
CREATE TABLE IF NOT EXISTS public.security_headers_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  header_name TEXT NOT NULL UNIQUE,
  header_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default security headers
INSERT INTO public.security_headers_config (header_name, header_value, description)
VALUES
  ('Content-Security-Policy', 'default-src ''self''; script-src ''self'' ''unsafe-inline'' https://js.stripe.com; frame-src https://js.stripe.com; img-src ''self'' data: https:; style-src ''self'' ''unsafe-inline'' https://fonts.googleapis.com; font-src ''self'' https://fonts.gstatic.com;', 'Prevents XSS and data injection attacks'),
  ('X-Frame-Options', 'DENY', 'Prevents clickjacking'),
  ('X-Content-Type-Options', 'nosniff', 'Prevents MIME type sniffing'),
  ('Strict-Transport-Security', 'max-age=31536000; includeSubDomains', 'Enforces HTTPS'),
  ('X-XSS-Protection', '1; mode=block', 'Legacy XSS protection'),
  ('Referrer-Policy', 'strict-origin-when-cross-origin', 'Controls referrer information'),
  ('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)', 'Controls browser features')
ON CONFLICT (header_name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity) WHERE severity IN ('warning', 'critical');
CREATE INDEX IF NOT EXISTS idx_failed_logins_identifier ON public.failed_login_attempts(identifier, ip_address);
CREATE INDEX IF NOT EXISTS idx_payment_security_user ON public.payment_security_log(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_headers_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only for most)
CREATE POLICY "Users can view their own security events"
  ON public.security_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security headers"
  ON public.security_headers_config FOR SELECT
  USING (true);

-- Function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_severity TEXT := 'info';
BEGIN
  -- Determine severity based on event type
  IF p_event_type IN ('suspicious_activity', 'session_hijack_attempt', 'xss_attempt', 'sql_injection_attempt') THEN
    v_severity := 'critical';
  ELSIF p_event_type IN ('login_failure', 'blocked_request', 'rate_limited', 'payment_failed') THEN
    v_severity := 'warning';
  END IF;

  INSERT INTO public.security_events (event_type, user_id, ip_address, user_agent, severity, details)
  VALUES (p_event_type, p_user_id, p_ip_address, p_user_agent, v_severity, p_details)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if IP is rate limited
CREATE OR REPLACE FUNCTION is_login_blocked(
  p_identifier TEXT,
  p_ip_address INET
)
RETURNS BOOLEAN AS $$
DECLARE
  v_attempt RECORD;
BEGIN
  SELECT * INTO v_attempt
  FROM public.failed_login_attempts
  WHERE identifier = p_identifier OR ip_address = p_ip_address
  ORDER BY attempt_count DESC
  LIMIT 1;

  IF FOUND AND v_attempt.locked_until > now() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record failed login
CREATE OR REPLACE FUNCTION record_failed_login(
  p_identifier TEXT,
  p_ip_address INET,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_attempt RECORD;
  v_lock_duration INTERVAL;
BEGIN
  SELECT * INTO v_attempt
  FROM public.failed_login_attempts
  WHERE identifier = p_identifier AND ip_address = p_ip_address;

  IF FOUND THEN
    -- Increment attempts
    UPDATE public.failed_login_attempts
    SET 
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      locked_until = CASE 
        WHEN attempt_count >= 5 THEN now() + INTERVAL '15 minutes'
        WHEN attempt_count >= 10 THEN now() + INTERVAL '1 hour'
        WHEN attempt_count >= 15 THEN now() + INTERVAL '24 hours'
        ELSE NULL
      END
    WHERE id = v_attempt.id;
  ELSE
    INSERT INTO public.failed_login_attempts (identifier, ip_address, user_agent)
    VALUES (p_identifier, p_ip_address, p_user_agent);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
