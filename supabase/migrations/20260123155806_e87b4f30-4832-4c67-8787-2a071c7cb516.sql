-- Add user status column to profiles for suspend/ban
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'suspended', 'banned'));

-- Add suspension details
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status_reason text,
ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone;

-- Create email_templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_content text NOT NULL,
  description text,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert email templates"
ON public.email_templates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update email templates"
ON public.email_templates FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete email templates"
ON public.email_templates FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create approval_requests table for various request types
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('provider_registration', 'reschedule', 'account_upgrade', 'refund')),
  requester_id uuid NOT NULL,
  related_id uuid, -- can be appointment_id, provider_profile_id, etc.
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  details jsonb DEFAULT '{}',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on approval_requests
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.approval_requests FOR SELECT
USING (auth.uid() = requester_id);

-- Users can create requests
CREATE POLICY "Users can create requests"
ON public.approval_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.approval_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests
CREATE POLICY "Admins can update requests"
ON public.approval_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Providers can view reschedule requests for their appointments
CREATE POLICY "Providers can view their reschedule requests"
ON public.approval_requests FOR SELECT
USING (
  request_type = 'reschedule' AND 
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN provider_profiles pp ON a.provider_id = pp.id
    WHERE a.id = approval_requests.related_id 
    AND pp.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, html_content, description, variables) VALUES
('appointment_confirmation', 'Your appointment is confirmed', '<h1>Appointment Confirmed</h1><p>Dear {{user_name}},</p><p>Your appointment with {{provider_name}} on {{date}} at {{time}} has been confirmed.</p><p>Best regards,<br>BookEase Team</p>', 'Sent when an appointment is confirmed', ARRAY['user_name', 'provider_name', 'date', 'time']),
('appointment_reminder', 'Reminder: Upcoming appointment', '<h1>Appointment Reminder</h1><p>Dear {{user_name}},</p><p>This is a reminder that you have an appointment with {{provider_name}} on {{date}} at {{time}}.</p><p>Best regards,<br>BookEase Team</p>', 'Sent as appointment reminder', ARRAY['user_name', 'provider_name', 'date', 'time']),
('appointment_cancelled', 'Appointment Cancelled', '<h1>Appointment Cancelled</h1><p>Dear {{user_name}},</p><p>Your appointment with {{provider_name}} on {{date}} has been cancelled.</p><p>Reason: {{reason}}</p><p>Best regards,<br>BookEase Team</p>', 'Sent when appointment is cancelled', ARRAY['user_name', 'provider_name', 'date', 'reason']),
('provider_approved', 'Your provider account is approved!', '<h1>Congratulations!</h1><p>Dear {{provider_name}},</p><p>Your provider account has been approved. You can now start accepting appointments.</p><p>Best regards,<br>BookEase Team</p>', 'Sent when provider is approved', ARRAY['provider_name']),
('account_suspended', 'Account Suspended', '<h1>Account Suspended</h1><p>Dear {{user_name}},</p><p>Your account has been suspended.</p><p>Reason: {{reason}}</p><p>If you believe this is an error, please contact support.</p><p>Best regards,<br>BookEase Team</p>', 'Sent when account is suspended', ARRAY['user_name', 'reason']),
('welcome', 'Welcome to BookEase!', '<h1>Welcome to BookEase!</h1><p>Dear {{user_name}},</p><p>Thank you for joining BookEase. We are excited to have you!</p><p>Best regards,<br>BookEase Team</p>', 'Sent to new users', ARRAY['user_name']);