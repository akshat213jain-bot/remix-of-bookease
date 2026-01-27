-- ============================================
-- TABLE: approval_requests
-- Description: Pending approval requests for providers and reschedules
-- ============================================

CREATE TABLE public.approval_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL,
    request_type TEXT NOT NULL,
    related_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REQUEST TYPES
-- ============================================
-- - provider_registration: New provider signup
-- - reschedule: Appointment reschedule request
-- - verification: Provider verification request

-- ============================================
-- STATUS VALUES
-- ============================================
-- - pending: Awaiting admin review
-- - approved: Request approved
-- - rejected: Request rejected

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY "Users can create requests" ON public.approval_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own requests" ON public.approval_requests
  FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "Admins can view all requests" ON public.approval_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests" ON public.approval_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers can view their reschedule requests" ON public.approval_requests
  FOR SELECT USING (
    request_type = 'reschedule' AND 
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN provider_profiles pp ON a.provider_id = pp.id
      WHERE a.id = approval_requests.related_id AND pp.user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_approval_requests_requester ON public.approval_requests(requester_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_type ON public.approval_requests(request_type);
