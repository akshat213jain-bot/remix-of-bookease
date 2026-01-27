-- =============================================
-- TIPPING
-- =============================================
-- Allow customers to tip providers after appointments

-- Tips table
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'INR',
  message TEXT, -- Optional thank you message
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_out BOOLEAN DEFAULT false, -- Transferred to provider
  payout_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tip presets (suggested amounts)
CREATE TABLE IF NOT EXISTS public.tip_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null for global
  preset_type TEXT NOT NULL CHECK (preset_type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL,
  label TEXT, -- e.g., "Good", "Great", "Excellent"
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tips_appointment ON public.tips(appointment_id);
CREATE INDEX IF NOT EXISTS idx_tips_user ON public.tips(user_id);
CREATE INDEX IF NOT EXISTS idx_tips_provider ON public.tips(provider_id);
CREATE INDEX IF NOT EXISTS idx_tips_status ON public.tips(status);

-- Enable RLS
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tips"
  ON public.tips FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = provider_id);

CREATE POLICY "Users can create tips"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view tip presets"
  ON public.tip_presets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Providers can manage their own presets"
  ON public.tip_presets FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Insert default global tip presets
INSERT INTO public.tip_presets (provider_id, preset_type, value, label, sort_order) VALUES
  (NULL, 'percentage', 10, 'Good 👍', 1),
  (NULL, 'percentage', 15, 'Great ⭐', 2),
  (NULL, 'percentage', 20, 'Excellent 🌟', 3),
  (NULL, 'fixed', 50, '₹50', 4),
  (NULL, 'fixed', 100, '₹100', 5),
  (NULL, 'fixed', 200, '₹200', 6)
ON CONFLICT DO NOTHING;

-- Function to get provider tip stats
CREATE OR REPLACE FUNCTION get_provider_tip_stats(p_provider_id UUID)
RETURNS TABLE (
  total_tips NUMERIC,
  total_count INTEGER,
  average_tip NUMERIC,
  this_month_tips NUMERIC,
  this_month_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0)::NUMERIC as total_tips,
    COUNT(*)::INTEGER as total_count,
    COALESCE(AVG(amount), 0)::NUMERIC as average_tip,
    COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0)::NUMERIC as this_month_tips,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::INTEGER as this_month_count
  FROM public.tips
  WHERE provider_id = p_provider_id AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
