-- ============================================
-- TABLE: email_templates
-- Description: Customizable email templates for notifications
-- ============================================

CREATE TABLE public.email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    description TEXT,
    variables TEXT[] DEFAULT '{}'::text[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEMPLATE VARIABLES
-- ============================================
-- Common variables: {{user_name}}, {{provider_name}}, {{appointment_date}}, 
-- {{appointment_time}}, {{service_name}}, {{amount}}, {{support_email}}

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY "Admins can view email templates" ON public.email_templates
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email templates" ON public.email_templates
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email templates" ON public.email_templates
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email templates" ON public.email_templates
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================

CREATE UNIQUE INDEX idx_email_templates_name ON public.email_templates(name);
CREATE INDEX idx_email_templates_active ON public.email_templates(is_active) WHERE is_active = true;
