-- =============================================
-- STREAK REWARDS
-- =============================================
-- Reward users for consecutive booking activity

-- Streak definitions
CREATE TABLE IF NOT EXISTS public.streak_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('booking', 'login', 'review', 'referral')),
  min_days INTEGER NOT NULL DEFAULT 7, -- Minimum streak length for rewards
  reward_milestones JSONB DEFAULT '[]', -- [{"days": 7, "points": 100}, {"days": 30, "points": 500}]
  bonus_multiplier NUMERIC DEFAULT 1.0, -- Extra points multiplier during streak
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User streaks tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_start_date DATE,
  total_streak_days INTEGER DEFAULT 0, -- Cumulative all-time
  times_broken INTEGER DEFAULT 0,
  last_milestone_claimed INTEGER DEFAULT 0, -- Days of last claimed milestone
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

-- Streak milestones claimed
CREATE TABLE IF NOT EXISTS public.streak_milestone_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_definition_id UUID NOT NULL REFERENCES public.streak_definitions(id) ON DELETE CASCADE,
  milestone_days INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL,
  streak_at_claim INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT now()
);

-- Streak freeze tokens (protect streak)
CREATE TABLE IF NOT EXISTS public.streak_freezes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL,
  freeze_date DATE NOT NULL,
  points_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, streak_type, freeze_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_type ON public.user_streaks(streak_type, current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_streak_milestones_user ON public.streak_milestone_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user ON public.streak_freezes(user_id, streak_type);

-- Enable RLS
ALTER TABLE public.streak_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_milestone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view streak definitions"
  ON public.streak_definitions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their milestone claims"
  ON public.streak_milestone_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their freezes"
  ON public.streak_freezes FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default streak definitions
INSERT INTO public.streak_definitions (name, description, streak_type, min_days, reward_milestones, bonus_multiplier)
VALUES
  (
    'Booking Streak',
    'Book appointments on consecutive weeks to build your streak',
    'booking',
    7,
    '[
      {"days": 7, "points": 100, "badge": "week_warrior"},
      {"days": 14, "points": 250, "badge": "fortnight_fighter"},
      {"days": 30, "points": 500, "badge": "monthly_master"},
      {"days": 60, "points": 1000, "badge": "streak_legend"},
      {"days": 90, "points": 2000, "badge": "streak_champion"}
    ]'::JSONB,
    1.5
  ),
  (
    'Review Streak',
    'Leave reviews after each completed appointment',
    'review',
    3,
    '[
      {"days": 3, "points": 50},
      {"days": 7, "points": 150},
      {"days": 14, "points": 300}
    ]'::JSONB,
    1.25
  ),
  (
    'Login Streak',
    'Open the app daily to maintain your streak',
    'login',
    7,
    '[
      {"days": 7, "points": 50},
      {"days": 30, "points": 200},
      {"days": 100, "points": 1000}
    ]'::JSONB,
    1.0
  )
ON CONFLICT DO NOTHING;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(
  p_user_id UUID,
  p_streak_type TEXT,
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS public.user_streaks AS $$
DECLARE
  v_streak public.user_streaks;
  v_days_since INTEGER;
  v_has_freeze BOOLEAN;
BEGIN
  -- Get or create streak record
  INSERT INTO public.user_streaks (user_id, streak_type, last_activity_date, streak_start_date)
  VALUES (p_user_id, p_streak_type, p_activity_date, p_activity_date)
  ON CONFLICT (user_id, streak_type) DO NOTHING;

  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;

  -- Already had activity today
  IF v_streak.last_activity_date = p_activity_date THEN
    RETURN v_streak;
  END IF;

  -- Calculate days since last activity
  v_days_since := p_activity_date - COALESCE(v_streak.last_activity_date, p_activity_date - 1);

  -- Check for freeze
  SELECT EXISTS (
    SELECT 1 FROM public.streak_freezes
    WHERE user_id = p_user_id 
      AND streak_type = p_streak_type
      AND freeze_date = v_streak.last_activity_date + 1
  ) INTO v_has_freeze;

  IF v_days_since = 1 OR (v_days_since = 2 AND v_has_freeze) THEN
    -- Continue streak
    v_streak.current_streak := v_streak.current_streak + 1;
    v_streak.total_streak_days := v_streak.total_streak_days + 1;
    
    IF v_streak.current_streak > v_streak.longest_streak THEN
      v_streak.longest_streak := v_streak.current_streak;
    END IF;
  ELSIF v_days_since > 1 THEN
    -- Streak broken
    v_streak.current_streak := 1;
    v_streak.streak_start_date := p_activity_date;
    v_streak.times_broken := v_streak.times_broken + 1;
  END IF;

  v_streak.last_activity_date := p_activity_date;
  v_streak.updated_at := now();

  UPDATE public.user_streaks SET
    current_streak = v_streak.current_streak,
    longest_streak = v_streak.longest_streak,
    last_activity_date = v_streak.last_activity_date,
    streak_start_date = v_streak.streak_start_date,
    total_streak_days = v_streak.total_streak_days,
    times_broken = v_streak.times_broken,
    updated_at = v_streak.updated_at
  WHERE id = v_streak.id;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award streak milestones
CREATE OR REPLACE FUNCTION check_streak_milestones(
  p_user_id UUID,
  p_streak_type TEXT
)
RETURNS TABLE (
  milestone_days INTEGER,
  points_awarded INTEGER,
  badge_id TEXT
) AS $$
DECLARE
  v_streak RECORD;
  v_def RECORD;
  v_milestone RECORD;
BEGIN
  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_def
  FROM public.streak_definitions
  WHERE streak_type = p_streak_type AND is_active = true
  LIMIT 1;

  IF NOT FOUND OR v_def.reward_milestones IS NULL THEN
    RETURN;
  END IF;

  FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_def.reward_milestones)
  LOOP
    IF v_streak.current_streak >= (v_milestone.value->>'days')::INTEGER
       AND v_streak.last_milestone_claimed < (v_milestone.value->>'days')::INTEGER
    THEN
      -- Award the milestone
      INSERT INTO public.streak_milestone_claims (
        user_id, streak_definition_id, milestone_days, points_awarded, streak_at_claim
      )
      VALUES (
        p_user_id, v_def.id, 
        (v_milestone.value->>'days')::INTEGER,
        (v_milestone.value->>'points')::INTEGER,
        v_streak.current_streak
      );

      -- Update last claimed
      UPDATE public.user_streaks
      SET last_milestone_claimed = (v_milestone.value->>'days')::INTEGER
      WHERE id = v_streak.id;

      -- Award points to loyalty program
      UPDATE public.loyalty_points
      SET total_points = total_points + (v_milestone.value->>'points')::INTEGER,
          current_points = current_points + (v_milestone.value->>'points')::INTEGER
      WHERE user_id = p_user_id;

      RETURN QUERY SELECT
        (v_milestone.value->>'days')::INTEGER,
        (v_milestone.value->>'points')::INTEGER,
        v_milestone.value->>'badge';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
