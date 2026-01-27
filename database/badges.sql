-- =============================================
-- BADGES & ACHIEVEMENTS (GAMIFICATION)
-- =============================================
-- Reward users with badges for milestones

-- Badges definition table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL, -- emoji or icon name
  category TEXT DEFAULT 'general', -- 'booking', 'review', 'referral', 'loyalty'
  criteria_type TEXT NOT NULL, -- 'bookings_count', 'reviews_count', 'referrals_count', 'points_earned', 'streak_days'
  criteria_value INTEGER NOT NULL,
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- User streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  streak_type TEXT NOT NULL DEFAULT 'booking', -- 'booking', 'login'
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, category, criteria_type, criteria_value, points_reward) VALUES
  ('First Booking', 'Complete your first appointment', '🎉', 'booking', 'bookings_count', 1, 50),
  ('Regular', 'Complete 5 appointments', '⭐', 'booking', 'bookings_count', 5, 100),
  ('Loyal Customer', 'Complete 10 appointments', '💎', 'booking', 'bookings_count', 10, 200),
  ('VIP', 'Complete 25 appointments', '👑', 'booking', 'bookings_count', 25, 500),
  ('First Review', 'Write your first review', '✍️', 'review', 'reviews_count', 1, 25),
  ('Reviewer', 'Write 5 reviews', '📝', 'review', 'reviews_count', 5, 75),
  ('Top Reviewer', 'Write 10 reviews', '🏆', 'review', 'reviews_count', 10, 150),
  ('First Referral', 'Refer your first friend', '🤝', 'referral', 'referrals_count', 1, 100),
  ('Ambassador', 'Refer 5 friends', '📣', 'referral', 'referrals_count', 5, 300),
  ('Weekly Streak', 'Book appointments 7 weeks in a row', '🔥', 'loyalty', 'streak_days', 7, 200),
  ('Monthly Streak', 'Book appointments 4 months in a row', '💪', 'loyalty', 'streak_days', 30, 500)
ON CONFLICT DO NOTHING;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE (badge_id UUID, badge_name TEXT, points INTEGER) AS $$
DECLARE
  v_badge RECORD;
  v_count INTEGER;
  v_awarded BOOLEAN;
BEGIN
  FOR v_badge IN SELECT * FROM public.badges WHERE is_active = true LOOP
    -- Check if already earned
    SELECT EXISTS(
      SELECT 1 FROM public.user_badges 
      WHERE user_id = p_user_id AND badge_id = v_badge.id
    ) INTO v_awarded;

    IF NOT v_awarded THEN
      -- Check criteria
      CASE v_badge.criteria_type
        WHEN 'bookings_count' THEN
          SELECT COUNT(*) INTO v_count
          FROM public.appointments
          WHERE user_id = p_user_id AND status = 'completed';
          
        WHEN 'reviews_count' THEN
          SELECT COUNT(*) INTO v_count
          FROM public.reviews
          WHERE user_id = p_user_id;
          
        WHEN 'referrals_count' THEN
          SELECT COUNT(*) INTO v_count
          FROM public.referrals
          WHERE referrer_id = p_user_id AND status = 'completed';
          
        WHEN 'streak_days' THEN
          SELECT current_streak INTO v_count
          FROM public.user_streaks
          WHERE user_id = p_user_id;
          v_count := COALESCE(v_count, 0);
          
        ELSE
          v_count := 0;
      END CASE;

      -- Award badge if criteria met
      IF v_count >= v_badge.criteria_value THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (p_user_id, v_badge.id);

        -- Award points
        IF v_badge.points_reward > 0 THEN
          INSERT INTO public.loyalty_points (user_id, points, source, description)
          VALUES (p_user_id, v_badge.points_reward, 'badge', 'Earned badge: ' || v_badge.name);
        END IF;

        RETURN QUERY SELECT v_badge.id, v_badge.name, v_badge.points_reward;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak RECORD;
  v_new_streak INTEGER;
BEGIN
  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE)
    RETURNING current_streak INTO v_new_streak;
  ELSIF v_streak.last_activity_date = CURRENT_DATE THEN
    -- Already logged today
    v_new_streak := v_streak.current_streak;
  ELSIF v_streak.last_activity_date = CURRENT_DATE - 1 THEN
    -- Consecutive day
    v_new_streak := v_streak.current_streak + 1;
    UPDATE public.user_streaks
    SET 
      current_streak = v_new_streak,
      longest_streak = GREATEST(longest_streak, v_new_streak),
      last_activity_date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    -- Streak broken
    v_new_streak := 1;
    UPDATE public.user_streaks
    SET 
      current_streak = 1,
      last_activity_date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
