-- ============================================
-- TABLE: outgoing_emails
-- Description: Email delivery tracking
-- ============================================

CREATE TABLE public.outgoing_emails (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'brevo',
    to_emails TEXT[] NOT NULL,
    subject TEXT NOT NULL,
    email_type TEXT,
    status TEXT NOT NULL DEFAULT 'accepted',
    sender_email TEXT,
    provider_response TEXT,
    last_event TEXT,
    last_event_at TIMESTAMP WITH TIME ZONE,
    last_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outgoing_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outgoing emails" ON public.outgoing_emails FOR SELECT USING (has_role(auth.uid(), 'admin'));
