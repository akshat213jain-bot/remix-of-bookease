-- Drop the existing check constraint and recreate with admin_registration included
ALTER TABLE public.approval_requests DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;

ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_request_type_check 
CHECK (request_type IN ('provider_registration', 'admin_registration', 'reschedule', 'account_upgrade', 'refund'));