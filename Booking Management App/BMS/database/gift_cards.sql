-- =============================================
-- GIFT CARDS
-- =============================================
-- Digital gift cards for purchasing and redemption

-- Gift cards table
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  purchaser_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  sender_name TEXT,
  personal_message TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance NUMERIC NOT NULL CHECK (balance >= 0),
  currency TEXT DEFAULT 'INR',
  design_template TEXT DEFAULT 'default', -- Card design
  stripe_payment_intent_id TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- null for no expiry
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gift card transactions
CREATE TABLE IF NOT EXISTS public.gift_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'redemption', 'refund', 'adjustment')),
  balance_after NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser ON public.gift_cards(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient ON public.gift_cards(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_card ON public.gift_card_transactions(gift_card_id);

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view gift cards they purchased or received"
  ON public.gift_cards FOR SELECT
  USING (auth.uid() = purchaser_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can purchase gift cards"
  ON public.gift_cards FOR INSERT
  WITH CHECK (auth.uid() = purchaser_id);

CREATE POLICY "Users can view their gift card transactions"
  ON public.gift_card_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gift_cards
      WHERE id = gift_card_id
      AND (purchaser_id = auth.uid() OR recipient_id = auth.uid())
    )
  );

-- Function to generate gift card code
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    FOR j IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    IF i < 4 THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate gift card code
CREATE OR REPLACE FUNCTION set_gift_card_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_gift_card_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gift_card_code_trigger
  BEFORE INSERT ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION set_gift_card_code();

-- Function to redeem gift card
CREATE OR REPLACE FUNCTION redeem_gift_card(
  p_code TEXT,
  p_user_id UUID,
  p_amount NUMERIC,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  remaining_balance NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_card RECORD;
  v_new_balance NUMERIC;
BEGIN
  -- Find and lock the gift card
  SELECT * INTO v_card
  FROM public.gift_cards
  WHERE code = UPPER(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::NUMERIC, 'Invalid gift card code'::TEXT;
    RETURN;
  END IF;

  IF NOT v_card.is_active THEN
    RETURN QUERY SELECT false, NULL::NUMERIC, 'Gift card is not active'::TEXT;
    RETURN;
  END IF;

  IF v_card.expires_at IS NOT NULL AND v_card.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::NUMERIC, 'Gift card has expired'::TEXT;
    RETURN;
  END IF;

  IF v_card.balance < p_amount THEN
    RETURN QUERY SELECT false, v_card.balance, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_card.balance - p_amount;

  -- Update balance
  UPDATE public.gift_cards
  SET 
    balance = v_new_balance,
    recipient_id = COALESCE(recipient_id, p_user_id),
    redeemed_at = COALESCE(redeemed_at, now())
  WHERE id = v_card.id;

  -- Record transaction
  INSERT INTO public.gift_card_transactions 
    (gift_card_id, appointment_id, user_id, amount, type, balance_after)
  VALUES 
    (v_card.id, p_appointment_id, p_user_id, p_amount, 'redemption', v_new_balance);

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
