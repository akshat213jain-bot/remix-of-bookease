-- =============================================
-- LEADERBOARDS
-- =============================================
-- Gamification leaderboards for providers and customers

-- Leaderboard definitions
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('provider', 'customer', 'global')),
  metric TEXT NOT NULL CHECK (metric IN ('bookings', 'revenue', 'rating', 'reviews', 'referrals', 'points', 'streak')),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  is_active BOOLEAN DEFAULT true,
  reward_enabled BOOLEAN DEFAULT false,
  reward_config JSONB DEFAULT '{}', -- {"1st": 500, "2nd": 250, "3rd": 100} points
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Leaderboard entries
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leaderboard_id UUID NOT NULL REFERENCES public.leaderboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  rank INTEGER,
  previous_rank INTEGER,
  rank_change INTEGER, -- positive = moved up, negative = moved down
  metadata JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(leaderboard_id, user_id, period_start)
);

-- Leaderboard rewards history
CREATE TABLE IF NOT EXISTS public.leaderboard_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leaderboard_id UUID NOT NULL REFERENCES public.leaderboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  final_rank INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'points', 'badge', 'discount'
  reward_value NUMERIC,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_lb ON public.leaderboard_entries(leaderboard_id, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON public.leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON public.leaderboard_entries(leaderboard_id, period_start, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_user ON public.leaderboard_rewards(user_id);

-- Enable RLS
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active leaderboards"
  ON public.leaderboards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view leaderboard entries"
  ON public.leaderboard_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can view their rewards"
  ON public.leaderboard_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default leaderboards
INSERT INTO public.leaderboards (name, description, leaderboard_type, metric, period_type, reward_enabled, reward_config)
VALUES
  ('Top Providers - Monthly', 'Highest rated providers this month', 'provider', 'rating', 'monthly', true, '{"1": 1000, "2": 500, "3": 250}'),
  ('Most Bookings - Weekly', 'Most active customers this week', 'customer', 'bookings', 'weekly', true, '{"1": 500, "2": 250, "3": 100}'),
  ('Referral Champions', 'Top referrers this month', 'customer', 'referrals', 'monthly', true, '{"1": 2000, "2": 1000, "3": 500}'),
  ('Loyalty Leaders', 'Highest loyalty points all time', 'customer', 'points', 'all_time', false, '{}'),
  ('Streak Masters', 'Longest booking streaks', 'customer', 'streak', 'all_time', true, '{"1": 1000}')
ON CONFLICT DO NOTHING;

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard(
  p_leaderboard_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_lb RECORD;
  v_period_start DATE;
  v_period_end DATE;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_lb FROM public.leaderboards WHERE id = p_leaderboard_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate period
  CASE v_lb.period_type
    WHEN 'daily' THEN
      v_period_start := CURRENT_DATE;
      v_period_end := CURRENT_DATE;
    WHEN 'weekly' THEN
      v_period_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
      v_period_end := v_period_start + INTERVAL '6 days';
    WHEN 'monthly' THEN
      v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
      v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    ELSE
      v_period_start := '2020-01-01'::DATE;
      v_period_end := CURRENT_DATE;
  END CASE;

  -- Save previous ranks
  UPDATE public.leaderboard_entries
  SET previous_rank = rank
  WHERE leaderboard_id = p_leaderboard_id AND period_start = v_period_start;

  -- Update entries based on metric
  IF v_lb.metric = 'bookings' THEN
    INSERT INTO public.leaderboard_entries (leaderboard_id, user_id, period_start, period_end, score)
    SELECT 
      p_leaderboard_id,
      CASE WHEN v_lb.leaderboard_type = 'provider' THEN provider_id ELSE user_id END,
      v_period_start,
      v_period_end,
      COUNT(*)
    FROM public.appointments
    WHERE status = 'completed'
      AND DATE(start_time) >= v_period_start
      AND DATE(start_time) <= v_period_end
    GROUP BY CASE WHEN v_lb.leaderboard_type = 'provider' THEN provider_id ELSE user_id END
    ON CONFLICT (leaderboard_id, user_id, period_start) 
    DO UPDATE SET score = EXCLUDED.score, last_updated = now();
  ELSIF v_lb.metric = 'rating' THEN
    INSERT INTO public.leaderboard_entries (leaderboard_id, user_id, period_start, period_end, score)
    SELECT 
      p_leaderboard_id,
      provider_id,
      v_period_start,
      v_period_end,
      AVG(rating)
    FROM public.reviews
    WHERE DATE(created_at) >= v_period_start
      AND DATE(created_at) <= v_period_end
    GROUP BY provider_id
    HAVING COUNT(*) >= 3
    ON CONFLICT (leaderboard_id, user_id, period_start) 
    DO UPDATE SET score = EXCLUDED.score, last_updated = now();
  END IF;

  -- Update ranks
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
    FROM public.leaderboard_entries
    WHERE leaderboard_id = p_leaderboard_id AND period_start = v_period_start
  )
  UPDATE public.leaderboard_entries e
  SET 
    rank = r.new_rank,
    rank_change = COALESCE(e.previous_rank, r.new_rank) - r.new_rank
  FROM ranked r
  WHERE e.id = r.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard with user details
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_leaderboard_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  score NUMERIC,
  rank_change INTEGER
) AS $$
DECLARE
  v_lb RECORD;
  v_period_start DATE;
BEGIN
  SELECT * INTO v_lb FROM public.leaderboards WHERE id = p_leaderboard_id;
  
  CASE v_lb.period_type
    WHEN 'daily' THEN v_period_start := CURRENT_DATE;
    WHEN 'weekly' THEN v_period_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    WHEN 'monthly' THEN v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    ELSE v_period_start := '2020-01-01'::DATE;
  END CASE;

  RETURN QUERY
  SELECT
    e.rank,
    e.user_id,
    COALESCE(p.full_name, u.email) as user_name,
    p.avatar_url as user_avatar,
    e.score,
    e.rank_change
  FROM public.leaderboard_entries e
  JOIN auth.users u ON e.user_id = u.id
  LEFT JOIN public.profiles p ON e.user_id = p.id
  WHERE e.leaderboard_id = p_leaderboard_id
    AND e.period_start = v_period_start
  ORDER BY e.rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
