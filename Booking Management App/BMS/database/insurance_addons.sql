-- =============================================
-- INSURANCE ADD-ONS
-- =============================================
-- Optional insurance coverage for bookings

-- Insurance products
CREATE TABLE IF NOT EXISTS public.insurance_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  insurance_type TEXT NOT NULL CHECK (insurance_type IN ('cancellation', 'no_show', 'damage', 'liability', 'comprehensive')),
  coverage_amount NUMERIC NOT NULL,
  deductible NUMERIC DEFAULT 0,
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'percentage', 'tiered')),
  price_value NUMERIC NOT NULL, -- Fixed amount or percentage
  price_tiers JSONB, -- For tiered pricing: [{"min": 0, "max": 100, "price": 5}, ...]
  min_booking_value NUMERIC DEFAULT 0,
  max_booking_value NUMERIC,
  coverage_details JSONB DEFAULT '{}',
  terms_url TEXT,
  provider_name TEXT, -- Insurance provider
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insurance purchases
CREATE TABLE IF NOT EXISTS public.insurance_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  insurance_product_id UUID NOT NULL REFERENCES public.insurance_products(id),
  coverage_amount NUMERIC NOT NULL,
  premium_paid NUMERIC NOT NULL,
  booking_value NUMERIC NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'cancelled', 'refunded')),
  policy_number TEXT UNIQUE,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  terms_accepted_at TIMESTAMPTZ DEFAULT now(),
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insurance_purchase_id UUID NOT NULL REFERENCES public.insurance_purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('cancellation', 'no_show', 'damage', 'other')),
  claim_reason TEXT NOT NULL,
  claim_amount NUMERIC NOT NULL,
  approved_amount NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'partially_approved', 'denied', 'paid')),
  denied_reason TEXT,
  evidence_urls JSONB DEFAULT '[]',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  payout_method TEXT, -- 'original_payment', 'bank_transfer', 'credit'
  notes TEXT
);

-- Insurance eligibility rules
CREATE TABLE IF NOT EXISTS public.insurance_eligibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insurance_product_id UUID NOT NULL REFERENCES public.insurance_products(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('service_category', 'provider', 'booking_window', 'user_tier', 'custom')),
  rule_config JSONB NOT NULL, -- e.g., {"categories": ["spa", "salon"]}, {"min_hours_before": 24}
  is_include BOOLEAN DEFAULT true, -- true = include, false = exclude
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_products_type ON public.insurance_products(insurance_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_insurance_purchases_user ON public.insurance_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_purchases_appointment ON public.insurance_purchases(appointment_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_purchase ON public.insurance_claims(insurance_purchase_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status) WHERE status IN ('pending', 'under_review');

-- Enable RLS
ALTER TABLE public.insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_eligibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active insurance products"
  ON public.insurance_products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their insurance purchases"
  ON public.insurance_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their claims"
  ON public.insurance_claims FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert default insurance products
INSERT INTO public.insurance_products (name, description, insurance_type, coverage_amount, price_type, price_value, coverage_details)
VALUES
  (
    'Cancellation Protection',
    'Get a full refund if you need to cancel for any reason',
    'cancellation',
    1000,
    'percentage',
    10,
    '{"covered_reasons": ["illness", "emergency", "weather", "any"], "refund_percent": 100, "claim_window_hours": 48}'::JSONB
  ),
  (
    'No-Show Shield',
    'Protected against provider no-shows',
    'no_show',
    500,
    'fixed',
    5,
    '{"compensation_type": "refund_plus_credit", "bonus_credit_percent": 20}'::JSONB
  ),
  (
    'Premium Coverage',
    'Comprehensive protection for high-value bookings',
    'comprehensive',
    5000,
    'tiered',
    0,
    '{"covered_reasons": ["cancellation", "no_show", "service_issue"], "includes_rebooking": true}'::JSONB
  )
ON CONFLICT DO NOTHING;

-- Function to generate policy number
CREATE OR REPLACE FUNCTION generate_policy_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate insurance premium
CREATE OR REPLACE FUNCTION calculate_insurance_premium(
  p_product_id UUID,
  p_booking_value NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_product RECORD;
  v_premium NUMERIC;
  v_tier RECORD;
BEGIN
  SELECT * INTO v_product
  FROM public.insurance_products
  WHERE id = p_product_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check booking value limits
  IF p_booking_value < v_product.min_booking_value THEN
    RETURN NULL;
  END IF;

  IF v_product.max_booking_value IS NOT NULL AND p_booking_value > v_product.max_booking_value THEN
    RETURN NULL;
  END IF;

  CASE v_product.price_type
    WHEN 'fixed' THEN
      v_premium := v_product.price_value;
    WHEN 'percentage' THEN
      v_premium := ROUND((p_booking_value * v_product.price_value / 100), 2);
    WHEN 'tiered' THEN
      FOR v_tier IN SELECT * FROM jsonb_array_elements(v_product.price_tiers)
      LOOP
        IF p_booking_value >= (v_tier.value->>'min')::NUMERIC 
           AND (v_tier.value->>'max' IS NULL OR p_booking_value <= (v_tier.value->>'max')::NUMERIC)
        THEN
          v_premium := (v_tier.value->>'price')::NUMERIC;
          EXIT;
        END IF;
      END LOOP;
  END CASE;

  RETURN COALESCE(v_premium, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check claim eligibility
CREATE OR REPLACE FUNCTION check_claim_eligibility(
  p_insurance_purchase_id UUID,
  p_claim_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_purchase RECORD;
  v_product RECORD;
  v_appointment RECORD;
  v_existing_claim BOOLEAN;
BEGIN
  SELECT ip.*, ins.* INTO v_purchase
  FROM public.insurance_purchases ip
  JOIN public.insurance_products ins ON ip.insurance_product_id = ins.id
  WHERE ip.id = p_insurance_purchase_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Insurance not found');
  END IF;

  -- Check if already claimed
  SELECT EXISTS (
    SELECT 1 FROM public.insurance_claims
    WHERE insurance_purchase_id = p_insurance_purchase_id
      AND status NOT IN ('denied', 'cancelled')
  ) INTO v_existing_claim;

  IF v_existing_claim THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Claim already exists');
  END IF;

  -- Check if policy is active
  IF v_purchase.status != 'active' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Policy is not active');
  END IF;

  -- Check validity period
  IF now() > v_purchase.valid_until THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Policy has expired');
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'coverage_amount', v_purchase.coverage_amount,
    'claim_types', v_purchase.coverage_details->'covered_reasons'
  );
END;
$$ LANGUAGE plpgsql;
