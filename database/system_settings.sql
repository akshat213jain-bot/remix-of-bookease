-- ============================================
-- TABLE: system_settings
-- Description: Application configuration settings
-- ============================================

CREATE TABLE public.system_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings" ON public.system_settings FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.system_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.system_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read currency setting" ON public.system_settings FOR SELECT USING (key = 'currency');
