-- =============================================
-- SOC 2 COMPREHENSIVE AUDIT LOGGING
-- =============================================
-- Enterprise-grade security audit trail

-- Comprehensive audit log (all system actions)
CREATE TABLE IF NOT EXISTS public.soc2_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Actor information
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  actor_ip INET,
  actor_user_agent TEXT,
  actor_session_id TEXT,
  
  -- Action information
  action_type TEXT NOT NULL CHECK (action_type IN (
    -- Authentication
    'auth.login', 'auth.logout', 'auth.register', 'auth.password_change', 'auth.mfa_setup',
    -- Data operations
    'data.create', 'data.read', 'data.update', 'data.delete', 'data.export', 'data.import',
    -- Administrative
    'admin.user_create', 'admin.user_update', 'admin.user_delete', 'admin.role_change',
    'admin.settings_change', 'admin.config_change',
    -- Security
    'security.access_granted', 'security.access_denied', 'security.policy_change',
    'security.incident_created', 'security.incident_resolved',
    -- System
    'system.backup', 'system.restore', 'system.deploy', 'system.maintenance',
    -- Business
    'business.payment', 'business.refund', 'business.booking', 'business.cancellation'
  )),
  action_description TEXT,
  
  -- Resource information
  resource_type TEXT, -- 'user', 'appointment', 'payment', etc.
  resource_id UUID,
  resource_name TEXT,
  
  -- Change tracking
  previous_state JSONB,
  new_state JSONB,
  changed_fields TEXT[],
  
  -- Context
  request_id TEXT, -- Correlation ID for tracing
  service_name TEXT DEFAULT 'booking-app',
  environment TEXT DEFAULT 'production',
  
  -- Outcome
  outcome TEXT DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'partial')),
  error_message TEXT,
  
  -- Compliance tags
  compliance_tags TEXT[], -- ['hipaa', 'pci', 'gdpr']
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security incidents
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Incident details
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'unauthorized_access', 'data_breach', 'malware', 'phishing',
    'ddos', 'insider_threat', 'policy_violation', 'system_compromise',
    'credential_leak', 'suspicious_activity', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Detection
  detected_at TIMESTAMPTZ DEFAULT now(),
  detected_by TEXT, -- 'automated', 'user_report', 'audit', etc.
  detection_method TEXT,
  
  -- Affected resources
  affected_users UUID[],
  affected_systems TEXT[],
  affected_data_types TEXT[],
  estimated_records_affected INTEGER,
  
  -- Response
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  containment_actions TEXT[],
  remediation_actions TEXT[],
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Timeline
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Documentation
  root_cause TEXT,
  lessons_learned TEXT,
  preventive_measures TEXT[],
  
  -- Reporting
  reported_to_authorities BOOLEAN DEFAULT false,
  reported_to_customers BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Access reviews (periodic review of user access)
CREATE TABLE IF NOT EXISTS public.access_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Review scope
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('quarterly', 'annual', 'termination', 'role_change', 'audit')),
  
  -- User being reviewed
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  current_roles TEXT[],
  current_permissions TEXT[],
  
  -- Review details
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  decision TEXT CHECK (decision IN ('approved', 'modified', 'revoked', 'pending')),
  justification TEXT,
  
  -- Changes made
  roles_added TEXT[],
  roles_removed TEXT[],
  permissions_added TEXT[],
  permissions_removed TEXT[],
  
  -- Compliance
  compliant BOOLEAN,
  compliance_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Change management records
CREATE TABLE IF NOT EXISTS public.change_management (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Change request
  change_type TEXT NOT NULL CHECK (change_type IN ('feature', 'bugfix', 'security', 'infrastructure', 'config', 'emergency')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Risk assessment
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  impact_assessment TEXT,
  rollback_plan TEXT,
  
  -- Approvals
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Implementation
  implemented_by UUID REFERENCES auth.users(id),
  implemented_at TIMESTAMPTZ,
  deployment_notes TEXT,
  
  -- Verification
  tested_by UUID REFERENCES auth.users(id),
  tested_at TIMESTAMPTZ,
  test_results TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implementing', 'completed', 'rolled_back')),
  
  -- Artifacts
  related_commits TEXT[],
  related_tickets TEXT[],
  documentation_links TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System availability log
CREATE TABLE IF NOT EXISTS public.availability_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_timestamp TIMESTAMPTZ DEFAULT now(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
  response_time_ms INTEGER,
  error_message TEXT,
  checked_from TEXT -- Region or server
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_soc2_audit_actor ON public.soc2_audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soc2_audit_action ON public.soc2_audit_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soc2_audit_resource ON public.soc2_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_soc2_audit_date ON public.soc2_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soc2_audit_compliance ON public.soc2_audit_logs USING GIN (compliance_tags);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status) WHERE status != 'closed';
CREATE INDEX IF NOT EXISTS idx_access_reviews_user ON public.access_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_service ON public.availability_log(service_name, check_timestamp DESC);

-- Enable RLS
ALTER TABLE public.soc2_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own audit logs"
  ON public.soc2_audit_logs FOR SELECT
  USING (auth.uid() = actor_id);

CREATE POLICY "Users can view their access reviews"
  ON public.access_reviews FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = reviewer_id);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_soc2_audit_log(
  p_actor_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_action_description TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_compliance_tags TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_changed_fields TEXT[];
  v_actor_email TEXT;
BEGIN
  -- Get actor email
  SELECT email INTO v_actor_email
  FROM auth.users WHERE id = p_actor_id;

  -- Calculate changed fields if both states provided
  IF p_previous_state IS NOT NULL AND p_new_state IS NOT NULL THEN
    SELECT ARRAY_AGG(key) INTO v_changed_fields
    FROM (
      SELECT key FROM jsonb_each(p_previous_state)
      EXCEPT
      SELECT key FROM jsonb_each(p_new_state)
      UNION
      SELECT key FROM jsonb_each(p_new_state)
      EXCEPT
      SELECT key FROM jsonb_each(p_previous_state)
      UNION
      SELECT p.key
      FROM jsonb_each(p_previous_state) p
      JOIN jsonb_each(p_new_state) n ON p.key = n.key
      WHERE p.value != n.value
    ) diff;
  END IF;

  INSERT INTO public.soc2_audit_logs (
    actor_id, actor_email, actor_ip, action_type, action_description,
    resource_type, resource_id, previous_state, new_state, changed_fields,
    compliance_tags
  )
  VALUES (
    p_actor_id, v_actor_email, p_ip_address, p_action_type, p_action_description,
    p_resource_type, p_resource_id, p_previous_state, p_new_state, v_changed_fields,
    p_compliance_tags
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit summary for compliance reports
CREATE OR REPLACE FUNCTION get_audit_summary(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  action_type TEXT,
  total_count BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  unique_actors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.action_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE outcome = 'success') as success_count,
    COUNT(*) FILTER (WHERE outcome = 'failure') as failure_count,
    COUNT(DISTINCT actor_id) as unique_actors
  FROM public.soc2_audit_logs l
  WHERE l.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY l.action_type
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
