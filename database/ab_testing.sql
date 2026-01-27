-- =============================================
-- A/B TESTING FOR PROVIDERS
-- =============================================
-- Test variations of services, pricing, and descriptions

-- A/B Test experiments
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  experiment_type TEXT NOT NULL CHECK (experiment_type IN ('pricing', 'description', 'image', 'availability', 'service_name', 'custom')),
  target_entity TEXT NOT NULL, -- 'service', 'profile', 'booking_page'
  target_entity_id UUID, -- service_id, etc.
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  traffic_split JSONB DEFAULT '{"control": 50, "variant": 50}', -- Percentage split
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  winner_variant TEXT, -- Set when experiment concludes
  min_conversions INTEGER DEFAULT 100, -- Minimum conversions before significance
  confidence_level NUMERIC DEFAULT 95, -- Required confidence %
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Experiment variants
CREATE TABLE IF NOT EXISTS public.ab_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'control', 'variant_a', 'variant_b'
  is_control BOOLEAN DEFAULT false,
  variant_data JSONB NOT NULL, -- The actual variant content
  weight INTEGER DEFAULT 50, -- Traffic weight 0-100
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  conversion_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN (conversions::NUMERIC / impressions) * 100 ELSE 0 END
  ) STORED,
  average_order_value NUMERIC GENERATED ALWAYS AS (
    CASE WHEN conversions > 0 THEN total_revenue / conversions ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User variant assignments
CREATE TABLE IF NOT EXISTS public.ab_user_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- For anonymous users
  variant_id UUID NOT NULL REFERENCES public.ab_variants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  conversion_value NUMERIC,
  UNIQUE(experiment_id, user_id),
  UNIQUE(experiment_id, session_id)
);

-- Experiment events
CREATE TABLE IF NOT EXISTS public.ab_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.ab_variants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion', 'bounce', 'engagement')),
  event_value NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_experiments_provider ON public.ab_experiments(provider_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON public.ab_experiments(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment ON public.ab_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_user_assignments_exp ON public.ab_user_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_user_assignments_user ON public.ab_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_experiment ON public.ab_events(experiment_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can manage their experiments"
  ON public.ab_experiments FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can manage their variants"
  ON public.ab_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ab_experiments
      WHERE id = experiment_id AND provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their assignments"
  ON public.ab_user_assignments FOR SELECT
  USING (auth.uid() = user_id);

-- Function to assign user to variant
CREATE OR REPLACE FUNCTION assign_ab_variant(
  p_experiment_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_experiment RECORD;
  v_variant_id UUID;
  v_existing_assignment UUID;
  v_random_weight INTEGER;
  v_cumulative_weight INTEGER := 0;
BEGIN
  -- Check for existing assignment
  IF p_user_id IS NOT NULL THEN
    SELECT variant_id INTO v_existing_assignment
    FROM public.ab_user_assignments
    WHERE experiment_id = p_experiment_id AND user_id = p_user_id;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT variant_id INTO v_existing_assignment
    FROM public.ab_user_assignments
    WHERE experiment_id = p_experiment_id AND session_id = p_session_id;
  END IF;

  IF v_existing_assignment IS NOT NULL THEN
    RETURN v_existing_assignment;
  END IF;

  -- Get experiment
  SELECT * INTO v_experiment
  FROM public.ab_experiments
  WHERE id = p_experiment_id AND status = 'running';

  IF NOT FOUND THEN
    -- Return control variant for non-running experiments
    SELECT id INTO v_variant_id
    FROM public.ab_variants
    WHERE experiment_id = p_experiment_id AND is_control = true
    LIMIT 1;
    RETURN v_variant_id;
  END IF;

  -- Randomly assign based on weights
  v_random_weight := floor(random() * 100);

  FOR v_variant_id, v_cumulative_weight IN
    SELECT v.id, v.weight + COALESCE(LAG(v.weight) OVER (ORDER BY v.created_at), 0)
    FROM public.ab_variants v
    WHERE v.experiment_id = p_experiment_id
    ORDER BY v.created_at
  LOOP
    IF v_random_weight < v_cumulative_weight THEN
      EXIT;
    END IF;
  END LOOP;

  -- Create assignment
  INSERT INTO public.ab_user_assignments (experiment_id, user_id, session_id, variant_id)
  VALUES (p_experiment_id, p_user_id, p_session_id, v_variant_id)
  ON CONFLICT DO NOTHING;

  -- Record impression
  INSERT INTO public.ab_events (experiment_id, variant_id, user_id, session_id, event_type)
  VALUES (p_experiment_id, v_variant_id, p_user_id, p_session_id, 'impression');

  -- Update variant impressions
  UPDATE public.ab_variants
  SET impressions = impressions + 1
  WHERE id = v_variant_id;

  RETURN v_variant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record conversion
CREATE OR REPLACE FUNCTION record_ab_conversion(
  p_experiment_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_value NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment RECORD;
BEGIN
  -- Find assignment
  SELECT * INTO v_assignment
  FROM public.ab_user_assignments
  WHERE experiment_id = p_experiment_id
    AND (user_id = p_user_id OR session_id = p_session_id)
    AND converted = false;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Update assignment
  UPDATE public.ab_user_assignments
  SET converted = true, converted_at = now(), conversion_value = p_value
  WHERE id = v_assignment.id;

  -- Update variant stats
  UPDATE public.ab_variants
  SET 
    conversions = conversions + 1,
    total_revenue = total_revenue + COALESCE(p_value, 0)
  WHERE id = v_assignment.variant_id;

  -- Record event
  INSERT INTO public.ab_events (experiment_id, variant_id, user_id, session_id, event_type, event_value)
  VALUES (p_experiment_id, v_assignment.variant_id, p_user_id, p_session_id, 'conversion', p_value);

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate statistical significance
CREATE OR REPLACE FUNCTION calculate_ab_significance(p_experiment_id UUID)
RETURNS TABLE (
  variant_name TEXT,
  impressions INTEGER,
  conversions INTEGER,
  conversion_rate NUMERIC,
  improvement_percent NUMERIC,
  is_significant BOOLEAN,
  confidence NUMERIC
) AS $$
DECLARE
  v_control RECORD;
BEGIN
  -- Get control stats
  SELECT * INTO v_control
  FROM public.ab_variants
  WHERE experiment_id = p_experiment_id AND is_control = true;

  RETURN QUERY
  SELECT
    v.name,
    v.impressions,
    v.conversions,
    v.conversion_rate,
    CASE WHEN v_control.conversion_rate > 0 
      THEN ((v.conversion_rate - v_control.conversion_rate) / v_control.conversion_rate) * 100
      ELSE 0 
    END,
    v.conversions >= 30 AND v_control.conversions >= 30, -- Simplified significance check
    CASE WHEN v.conversions >= 30 AND v_control.conversions >= 30
      THEN 95.0 -- Simplified - would need proper statistical calculation
      ELSE 0
    END
  FROM public.ab_variants v
  WHERE v.experiment_id = p_experiment_id
  ORDER BY v.conversion_rate DESC;
END;
$$ LANGUAGE plpgsql;
