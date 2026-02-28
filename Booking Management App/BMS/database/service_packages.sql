-- =============================================
-- SERVICE PACKAGES
-- =============================================
-- Bundle multiple services at discounted rates

-- Service packages table
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  services JSONB NOT NULL, -- [{service_id, service_name, quantity}]
  original_price NUMERIC NOT NULL,
  discounted_price NUMERIC NOT NULL,
  savings_amount NUMERIC GENERATED ALWAYS AS (original_price - discounted_price) STORED,
  savings_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN original_price > 0 
    THEN ROUND(((original_price - discounted_price) / original_price * 100)::NUMERIC, 0)
    ELSE 0 END
  ) STORED,
  valid_days INTEGER DEFAULT 90, -- Days to use after purchase
  max_purchases INTEGER, -- null for unlimited
  purchases_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User purchased packages
CREATE TABLE IF NOT EXISTS public.user_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  remaining_services JSONB NOT NULL, -- [{service_id, remaining}]
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used', 'refunded'))
);

-- Package redemption history
CREATE TABLE IF NOT EXISTS public.package_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_package_id UUID NOT NULL REFERENCES public.user_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_packages_provider ON public.service_packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON public.service_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_user_packages_user ON public.user_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_status ON public.user_packages(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_package_redemptions_package ON public.package_redemptions(user_package_id);

-- Enable RLS
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_packages
CREATE POLICY "Anyone can view active packages"
  ON public.service_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Providers can manage their own packages"
  ON public.service_packages FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- RLS Policies for user_packages
CREATE POLICY "Users can view their own packages"
  ON public.user_packages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase packages"
  ON public.user_packages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for package_redemptions
CREATE POLICY "Users can view their own redemptions"
  ON public.package_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_packages
      WHERE id = user_package_id AND user_id = auth.uid()
    )
  );

-- Function to redeem package service
CREATE OR REPLACE FUNCTION redeem_package_service(
  p_user_package_id UUID,
  p_service_id UUID,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  remaining INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_package RECORD;
  v_service_remaining INTEGER;
  v_new_remaining JSONB;
  v_item JSONB;
  v_found BOOLEAN := false;
BEGIN
  -- Get user package
  SELECT * INTO v_package
  FROM public.user_packages
  WHERE id = p_user_package_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::INTEGER, 'Package not found'::TEXT;
    RETURN;
  END IF;

  IF v_package.user_id != auth.uid() THEN
    RETURN QUERY SELECT false, NULL::INTEGER, 'Not authorized'::TEXT;
    RETURN;
  END IF;

  IF v_package.status != 'active' THEN
    RETURN QUERY SELECT false, NULL::INTEGER, 'Package is not active'::TEXT;
    RETURN;
  END IF;

  IF v_package.expires_at < now() THEN
    UPDATE public.user_packages SET status = 'expired' WHERE id = p_user_package_id;
    RETURN QUERY SELECT false, NULL::INTEGER, 'Package has expired'::TEXT;
    RETURN;
  END IF;

  -- Find service in remaining and decrement
  v_new_remaining := '[]'::JSONB;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_package.remaining_services)
  LOOP
    IF (v_item->>'service_id')::UUID = p_service_id THEN
      v_found := true;
      v_service_remaining := (v_item->>'remaining')::INTEGER;
      
      IF v_service_remaining <= 0 THEN
        RETURN QUERY SELECT false, 0::INTEGER, 'No remaining uses for this service'::TEXT;
        RETURN;
      END IF;
      
      v_service_remaining := v_service_remaining - 1;
      v_item := jsonb_set(v_item, '{remaining}', to_jsonb(v_service_remaining));
    END IF;
    v_new_remaining := v_new_remaining || v_item;
  END LOOP;

  IF NOT v_found THEN
    RETURN QUERY SELECT false, NULL::INTEGER, 'Service not in package'::TEXT;
    RETURN;
  END IF;

  -- Update remaining services
  UPDATE public.user_packages
  SET remaining_services = v_new_remaining
  WHERE id = p_user_package_id;

  -- Record redemption
  INSERT INTO public.package_redemptions (user_package_id, service_id, appointment_id)
  VALUES (p_user_package_id, p_service_id, p_appointment_id);

  -- Check if all services used
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_new_remaining) elem
    WHERE (elem->>'remaining')::INTEGER > 0
  ) THEN
    UPDATE public.user_packages SET status = 'used' WHERE id = p_user_package_id;
  END IF;

  RETURN QUERY SELECT true, v_service_remaining, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
