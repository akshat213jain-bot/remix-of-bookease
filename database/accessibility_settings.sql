-- =============================================
-- WCAG ACCESSIBILITY SETTINGS
-- =============================================
-- User preferences for accessibility features

-- User accessibility preferences
CREATE TABLE IF NOT EXISTS public.user_accessibility_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Visual preferences
  high_contrast_mode BOOLEAN DEFAULT false,
  font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'extra-large')),
  reduced_motion BOOLEAN DEFAULT false,
  color_blind_mode TEXT DEFAULT 'none' CHECK (color_blind_mode IN ('none', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy')),
  
  -- Audio preferences
  screen_reader_optimized BOOLEAN DEFAULT false,
  audio_descriptions BOOLEAN DEFAULT false,
  captions_enabled BOOLEAN DEFAULT true,
  
  -- Interaction preferences
  keyboard_navigation BOOLEAN DEFAULT true,
  focus_indicators_enhanced BOOLEAN DEFAULT false,
  extended_time_limits BOOLEAN DEFAULT false,
  click_assistance BOOLEAN DEFAULT false, -- Larger click targets
  
  -- Content preferences
  simple_language BOOLEAN DEFAULT false,
  reading_guide BOOLEAN DEFAULT false, -- Highlight line being read
  dyslexia_font BOOLEAN DEFAULT false, -- Use OpenDyslexic font
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accessibility feedback/issues
CREATE TABLE IF NOT EXISTS public.accessibility_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('navigation', 'screen_reader', 'color_contrast', 'keyboard', 'focus', 'form', 'other')),
  description TEXT NOT NULL,
  assistive_technology TEXT, -- JAWS, NVDA, VoiceOver, etc.
  browser TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'fixed', 'wont_fix')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Accessibility audit log
CREATE TABLE IF NOT EXISTS public.accessibility_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT NOT NULL,
  wcag_level TEXT NOT NULL CHECK (wcag_level IN ('A', 'AA', 'AAA')),
  issues_found INTEGER DEFAULT 0,
  issues_details JSONB DEFAULT '[]',
  tested_by TEXT,
  tool_used TEXT, -- axe, WAVE, Lighthouse, etc.
  audit_date TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_a11y_prefs_user ON public.user_accessibility_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_a11y_feedback_status ON public.accessibility_feedback(status) WHERE status = 'open';

-- Enable RLS
ALTER TABLE public.user_accessibility_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their accessibility preferences"
  ON public.user_accessibility_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can submit accessibility feedback"
  ON public.accessibility_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own feedback"
  ON public.accessibility_feedback FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Function to get or create preferences
CREATE OR REPLACE FUNCTION get_accessibility_preferences(p_user_id UUID)
RETURNS public.user_accessibility_preferences AS $$
DECLARE
  v_prefs public.user_accessibility_preferences;
BEGIN
  SELECT * INTO v_prefs
  FROM public.user_accessibility_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_accessibility_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;

  RETURN v_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
