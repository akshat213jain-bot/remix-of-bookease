-- Table: booking_groups
-- Description: Groups multiple appointments for multi-provider booking

CREATE TABLE IF NOT EXISTS public.booking_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text,
  total_amount numeric DEFAULT 0,
  discount_applied numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their booking groups" ON public.booking_groups
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all booking groups" ON public.booking_groups
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_groups_user ON public.booking_groups(user_id);
