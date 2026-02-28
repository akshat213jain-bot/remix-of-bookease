-- =============================================
-- SOCIAL LOGIN SUPPORT
-- =============================================
-- Extended user profiles for social authentication

-- Social login connections
CREATE TABLE IF NOT EXISTS public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook', 'apple', 'twitter', 'github')),
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  provider_name TEXT,
  provider_avatar TEXT,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  raw_user_meta JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

-- Social login activity log
CREATE TABLE IF NOT EXISTS public.social_login_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login', 'signup', 'link', 'unlink', 'refresh', 'error')),
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_connections_user ON public.social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_provider ON public.social_connections(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_social_login_logs_user ON public.social_login_logs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_login_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own social connections"
  ON public.social_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own social connections"
  ON public.social_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own login logs"
  ON public.social_login_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Function to link social account
CREATE OR REPLACE FUNCTION link_social_account(
  p_user_id UUID,
  p_provider TEXT,
  p_provider_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_avatar TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
BEGIN
  -- Check if already linked to another user
  IF EXISTS (
    SELECT 1 FROM public.social_connections
    WHERE provider = p_provider 
    AND provider_user_id = p_provider_user_id
    AND user_id != p_user_id
  ) THEN
    RAISE EXCEPTION 'This social account is already linked to another user';
  END IF;

  -- Insert or update connection
  INSERT INTO public.social_connections (
    user_id, provider, provider_user_id, 
    provider_email, provider_name, provider_avatar
  )
  VALUES (
    p_user_id, p_provider, p_provider_user_id,
    p_email, p_name, p_avatar
  )
  ON CONFLICT (provider, provider_user_id) 
  DO UPDATE SET
    provider_email = EXCLUDED.provider_email,
    provider_name = EXCLUDED.provider_name,
    provider_avatar = EXCLUDED.provider_avatar,
    last_used_at = now()
  RETURNING id INTO v_connection_id;

  -- Log the action
  INSERT INTO public.social_login_logs (user_id, provider, action)
  VALUES (p_user_id, p_provider, 'link');

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's connected providers
CREATE OR REPLACE FUNCTION get_connected_providers(p_user_id UUID)
RETURNS TABLE (
  provider TEXT,
  provider_email TEXT,
  provider_name TEXT,
  connected_at TIMESTAMPTZ,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.provider,
    sc.provider_email,
    sc.provider_name,
    sc.connected_at,
    sc.is_primary
  FROM public.social_connections sc
  WHERE sc.user_id = p_user_id
  ORDER BY sc.connected_at;
END;
$$ LANGUAGE plpgsql;
