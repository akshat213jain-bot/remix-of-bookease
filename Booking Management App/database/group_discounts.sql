-- Table: group_discounts
-- Description: Multi-appointment discount configurations per provider

CREATE TABLE IF NOT EXISTS public.group_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  min_appointments integer NOT NULL DEFAULT 2,
  discount_percentage numeric NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_discounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can manage their discounts" ON public.group_discounts
  FOR ALL USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can view active discounts" ON public.group_discounts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all discounts" ON public.group_discounts
  FOR ALL USING (has_role(auth.uid(), 'admin'));
