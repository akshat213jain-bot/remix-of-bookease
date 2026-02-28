-- Email delivery tracking (Brevo)

CREATE TABLE IF NOT EXISTS public.outgoing_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'brevo',
  to_emails text[] NOT NULL,
  subject text NOT NULL,
  email_type text,
  status text NOT NULL DEFAULT 'accepted',
  sender_email text,
  last_event text,
  last_event_at timestamptz,
  provider_response text,
  last_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outgoing_emails ENABLE ROW LEVEL SECURITY;

-- Admins can read delivery logs
CREATE POLICY "Admins can view outgoing emails"
ON public.outgoing_emails
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Keep updated_at current
DROP TRIGGER IF EXISTS update_outgoing_emails_updated_at ON public.outgoing_emails;
CREATE TRIGGER update_outgoing_emails_updated_at
BEFORE UPDATE ON public.outgoing_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_outgoing_emails_status_created
ON public.outgoing_emails (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outgoing_emails_last_event_at
ON public.outgoing_emails (last_event_at DESC);