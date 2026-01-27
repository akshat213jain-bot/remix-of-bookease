-- =============================================
-- REFERRAL TIERS
-- =============================================
-- Multi-level referral reward system

-- Referral tiers configuration
CREATE TABLE IF NOT EXISTS public.referral_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tier_level INTEGER NOT NULL UNIQUE,
  min_referrals INTEGER NOT NULL,
  max_referrals INTEGER, -- null for unlimited
  referrer_reward_points INTEGER NOT NULL,
  referee_reward_points INTEGER NOT NULL,
  referrer_discount_percent NUMERIC DEFAULT 0,
  referee_discount_percent NUMERIC DEFAULT 0,
  bonus_on_referee_booking NUMERIC DEFAULT 0, -- Extra points when referee books
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User referral status
CREATE TABLE IF NOT EXISTS public.user_referral_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  current_tier_id UUID REFERENCES public.referral_tiers(id),
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0, -- Referees who completed a booking
  total_earned_points INTEGER DEFAULT 0,
  total_earned_discount NUMERIC DEFAULT 0,
  referred_by UUID REFERENCES auth.users(id),
  referred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual referrals tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'booked', 'completed', 'expired')),
  tier_at_referral INTEGER,
  referrer_points_awarded INTEGER DEFAULT 0,
  referee_points_awarded INTEGER DEFAULT 0,
  first_booking_id UUID REFERENCES public.appointments(id),
  first_booking_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referrer_id, referee_id)
);

-- Referral rewards history
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('signup_bonus', 'booking_bonus', 'tier_bonus', 'milestone_bonus')),
  points INTEGER DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_tiers_level ON public.referral_tiers(tier_level);
CREATE INDEX IF NOT EXISTS idx_user_referral_code ON public.user_referral_status(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referral_user ON public.user_referral_status(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON public.referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);

-- Enable RLS
ALTER TABLE public.referral_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referral_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view referral tiers"
  ON public.referral_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their referral status"
  ON public.user_referral_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() IN (referrer_id, referee_id));

CREATE POLICY "Users can view their referral rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default referral tiers
INSERT INTO public.referral_tiers (name, description, tier_level, min_referrals, max_referrals, referrer_reward_points, referee_reward_points, referrer_discount_percent, color, icon)
VALUES
  ('Bronze', 'Starting tier for new referrers', 1, 0, 4, 100, 50, 5, '#CD7F32', '🥉'),
  ('Silver', 'Unlock after 5 successful referrals', 2, 5, 14, 150, 75, 7, '#C0C0C0', '🥈'),
  ('Gold', 'Elite referrer status', 3, 15, 29, 200, 100, 10, '#FFD700', '🥇'),
  ('Platinum', 'Top-tier ambassador', 4, 30, 49, 300, 150, 12, '#E5E4E2', '💎'),
  ('Diamond', 'Ultimate referral champion', 5, 50, NULL, 500, 200, 15, '#B9F2FF', '👑')
ON CONFLICT DO NOTHING;

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS (SELECT 1 FROM public.user_referral_status WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create user referral status
CREATE OR REPLACE FUNCTION create_user_referral_status()
RETURNS TRIGGER AS $$
DECLARE
  v_first_tier_id UUID;
BEGIN
  SELECT id INTO v_first_tier_id
  FROM public.referral_tiers
  WHERE tier_level = 1 AND is_active = true
  LIMIT 1;

  INSERT INTO public.user_referral_status (user_id, referral_code, current_tier_id)
  VALUES (NEW.id, generate_referral_code(), v_first_tier_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create referral status for new users
DROP TRIGGER IF EXISTS tr_create_referral_status ON auth.users;
CREATE TRIGGER tr_create_referral_status
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_referral_status();

-- Function to process referral signup
CREATE OR REPLACE FUNCTION process_referral_signup(
  p_referee_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_status RECORD;
  v_tier RECORD;
  v_referral_id UUID;
BEGIN
  -- Find referrer by code
  SELECT * INTO v_referrer_status
  FROM public.user_referral_status
  WHERE referral_code = UPPER(p_referral_code);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Can't refer yourself
  IF v_referrer_status.user_id = p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = p_referee_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already referred');
  END IF;

  -- Get current tier
  SELECT * INTO v_tier
  FROM public.referral_tiers
  WHERE id = v_referrer_status.current_tier_id;

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status, tier_at_referral)
  VALUES (v_referrer_status.user_id, p_referee_id, p_referral_code, 'signed_up', v_tier.tier_level)
  RETURNING id INTO v_referral_id;

  -- Update referee's status
  UPDATE public.user_referral_status
  SET referred_by = v_referrer_status.user_id, referred_at = now()
  WHERE user_id = p_referee_id;

  -- Award signup points
  INSERT INTO public.referral_rewards (user_id, referral_id, reward_type, points, description)
  VALUES 
    (v_referrer_status.user_id, v_referral_id, 'signup_bonus', v_tier.referrer_reward_points, 'Referral signup bonus'),
    (p_referee_id, v_referral_id, 'signup_bonus', v_tier.referee_reward_points, 'Welcome bonus from referral');

  -- Update referrer stats
  UPDATE public.user_referral_status
  SET 
    total_referrals = total_referrals + 1,
    total_earned_points = total_earned_points + v_tier.referrer_reward_points,
    updated_at = now()
  WHERE user_id = v_referrer_status.user_id;

  -- Check for tier upgrade
  PERFORM check_referral_tier_upgrade(v_referrer_status.user_id);

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_points', v_tier.referrer_reward_points,
    'referee_points', v_tier.referee_reward_points
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check and apply tier upgrade
CREATE OR REPLACE FUNCTION check_referral_tier_upgrade(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_status RECORD;
  v_new_tier RECORD;
BEGIN
  SELECT * INTO v_status
  FROM public.user_referral_status
  WHERE user_id = p_user_id;

  SELECT * INTO v_new_tier
  FROM public.referral_tiers
  WHERE is_active = true
    AND min_referrals <= v_status.successful_referrals
    AND (max_referrals IS NULL OR max_referrals >= v_status.successful_referrals)
  ORDER BY tier_level DESC
  LIMIT 1;

  IF v_new_tier.id != v_status.current_tier_id THEN
    UPDATE public.user_referral_status
    SET current_tier_id = v_new_tier.id, updated_at = now()
    WHERE user_id = p_user_id;

    -- Award tier upgrade bonus
    INSERT INTO public.referral_rewards (user_id, reward_type, points, description)
    VALUES (p_user_id, 'tier_bonus', v_new_tier.tier_level * 100, 'Tier upgrade to ' || v_new_tier.name);

    RETURN v_new_tier.id;
  END IF;

  RETURN v_status.current_tier_id;
END;
$$ LANGUAGE plpgsql;
