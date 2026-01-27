-- =============================================
-- COUPONS / DISCOUNT CODES
-- =============================================
-- This schema supports platform-wide and provider-specific coupons
-- with percentage or fixed discounts

-- Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null for platform-wide
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_purchase NUMERIC DEFAULT 0,
  max_discount NUMERIC, -- cap for percentage discounts
  max_uses INTEGER, -- null for unlimited
  uses_count INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  applicable_services UUID[], -- null for all services
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Coupon usage tracking
CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  discount_amount NUMERIC NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coupon_id, appointment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_provider ON public.coupons(provider_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_user ON public.coupon_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON public.coupon_uses(coupon_id);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Providers can manage their own coupons"
  ON public.coupons FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Admins can manage all coupons"
  ON public.coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for coupon_uses
CREATE POLICY "Users can view their own coupon uses"
  ON public.coupon_uses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert coupon uses"
  ON public.coupon_uses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to validate coupon
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_amount NUMERIC,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INTEGER;
  v_discount NUMERIC;
BEGIN
  -- Find the coupon
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(p_code)
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Invalid coupon code'::TEXT;
    RETURN;
  END IF;

  -- Check validity dates
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Coupon is not yet valid'::TEXT;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Coupon has expired'::TEXT;
    RETURN;
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Coupon usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- Check user usage limit
  SELECT COUNT(*) INTO v_user_uses
  FROM public.coupon_uses
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_user_uses >= v_coupon.max_uses_per_user THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'You have already used this coupon'::TEXT;
    RETURN;
  END IF;

  -- Check minimum purchase
  IF p_amount < v_coupon.min_purchase THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 
      format('Minimum purchase of %s required', v_coupon.min_purchase)::TEXT;
    RETURN;
  END IF;

  -- Check applicable services
  IF v_coupon.applicable_services IS NOT NULL AND p_service_id IS NOT NULL THEN
    IF NOT (p_service_id = ANY(v_coupon.applicable_services)) THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Coupon not valid for this service'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := p_amount * (v_coupon.discount_value / 100);
    IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
      v_discount := v_coupon.max_discount;
    END IF;
  ELSE
    v_discount := LEAST(v_coupon.discount_value, p_amount);
  END IF;

  RETURN QUERY SELECT 
    true, 
    v_coupon.id, 
    v_coupon.discount_type, 
    v_coupon.discount_value, 
    v_discount,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply coupon (after payment confirmed)
CREATE OR REPLACE FUNCTION apply_coupon(
  p_coupon_id UUID,
  p_user_id UUID,
  p_appointment_id UUID,
  p_discount_amount NUMERIC
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert usage record
  INSERT INTO public.coupon_uses (coupon_id, user_id, appointment_id, discount_amount)
  VALUES (p_coupon_id, p_user_id, p_appointment_id, p_discount_amount);

  -- Increment usage count
  UPDATE public.coupons
  SET uses_count = uses_count + 1, updated_at = now()
  WHERE id = p_coupon_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
