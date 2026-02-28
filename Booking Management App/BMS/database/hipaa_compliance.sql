-- =============================================
-- HIPAA COMPLIANCE
-- =============================================
-- Protected Health Information (PHI) security

-- PHI Access Logs (required by HIPAA)
CREATE TABLE IF NOT EXISTS public.phi_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'create', 'update', 'delete', 'export', 'print')),
  resource_type TEXT NOT NULL, -- 'medical_record', 'appointment', 'prescription', etc.
  resource_id UUID,
  access_reason TEXT NOT NULL, -- Purpose of access
  fields_accessed TEXT[], -- Which specific fields were viewed
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  access_granted BOOLEAN DEFAULT true,
  denial_reason TEXT, -- If access was denied
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Encrypted health data storage
CREATE TABLE IF NOT EXISTS public.encrypted_health_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('medical_history', 'allergies', 'medications', 'conditions', 'notes', 'documents')),
  encrypted_data BYTEA NOT NULL, -- AES-256 encrypted
  encryption_key_id TEXT NOT NULL, -- Reference to KMS key
  iv BYTEA NOT NULL, -- Initialization vector
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ -- For retention policy
);

-- Data retention policies
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type TEXT NOT NULL UNIQUE,
  retention_period_days INTEGER NOT NULL,
  description TEXT,
  legal_requirement TEXT, -- Which law requires this
  auto_delete BOOLEAN DEFAULT false,
  archive_before_delete BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default HIPAA retention policies
INSERT INTO public.data_retention_policies (data_type, retention_period_days, description, legal_requirement)
VALUES
  ('medical_records', 2555, '7 years for adult medical records', 'HIPAA'),
  ('billing_records', 2555, '7 years for billing/payment records', 'HIPAA/IRS'),
  ('appointment_history', 2555, '7 years linked to medical records', 'HIPAA'),
  ('audit_logs', 2190, '6 years for audit trails', 'HIPAA'),
  ('consent_forms', 2555, '7 years for consent documentation', 'HIPAA'),
  ('minor_records', 7300, '20 years for pediatric records', 'State Laws')
ON CONFLICT (data_type) DO NOTHING;

-- Business Associate Agreements (BAA) tracking
CREATE TABLE IF NOT EXISTS public.baa_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL, -- 'cloud_provider', 'payment_processor', 'analytics', etc.
  baa_signed_date DATE NOT NULL,
  baa_expiry_date DATE,
  contact_email TEXT,
  document_url TEXT,
  phi_access_scope TEXT[], -- What PHI they can access
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert known BAAs
INSERT INTO public.baa_agreements (vendor_name, vendor_type, baa_signed_date, phi_access_scope, status)
VALUES
  ('Supabase', 'cloud_provider', CURRENT_DATE, ARRAY['database_storage', 'backups'], 'pending'),
  ('Stripe', 'payment_processor', CURRENT_DATE, ARRAY['payment_info'], 'active')
ON CONFLICT DO NOTHING;

-- HIPAA breach log
CREATE TABLE IF NOT EXISTS public.hipaa_breach_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  breach_date DATE NOT NULL,
  discovery_date DATE NOT NULL,
  individuals_affected INTEGER,
  phi_types_exposed TEXT[],
  breach_type TEXT NOT NULL CHECK (breach_type IN ('unauthorized_access', 'theft', 'loss', 'improper_disposal', 'hacking', 'other')),
  description TEXT NOT NULL,
  mitigation_steps TEXT,
  notification_sent_date DATE, -- Must be within 60 days
  hhs_reported BOOLEAN DEFAULT false, -- Report to HHS if 500+ affected
  status TEXT DEFAULT 'investigating' CHECK (status IN ('investigating', 'contained', 'resolved', 'reported')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Patient consent records
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('treatment', 'phi_disclosure', 'marketing', 'research', 'payment')),
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  collected_by UUID REFERENCES auth.users(id),
  signature_data TEXT, -- Base64 signature if applicable
  ip_address INET,
  UNIQUE(patient_id, consent_type, purpose)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phi_access_patient ON public.phi_access_logs(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phi_access_user ON public.phi_access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phi_access_date ON public.phi_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_encrypted_health_patient ON public.encrypted_health_data(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_patient ON public.patient_consents(patient_id);

-- Enable RLS
ALTER TABLE public.phi_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baa_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_breach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Patients can view their own PHI access logs"
  ON public.phi_access_logs FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Healthcare providers can log PHI access"
  ON public.phi_access_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Patients can view their own health data"
  ON public.encrypted_health_data FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can view their consents"
  ON public.patient_consents FOR ALL
  USING (auth.uid() = patient_id);

-- Function to log PHI access
CREATE OR REPLACE FUNCTION log_phi_access(
  p_user_id UUID,
  p_patient_id UUID,
  p_access_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_access_reason TEXT DEFAULT 'treatment',
  p_fields_accessed TEXT[] DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.phi_access_logs (
    user_id, patient_id, access_type, resource_type, 
    resource_id, access_reason, fields_accessed, ip_address
  )
  VALUES (
    p_user_id, p_patient_id, p_access_type, p_resource_type,
    p_resource_id, p_access_reason, p_fields_accessed, p_ip_address
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if consent is granted
CREATE OR REPLACE FUNCTION has_patient_consent(
  p_patient_id UUID,
  p_consent_type TEXT,
  p_purpose TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.patient_consents
    WHERE patient_id = p_patient_id
      AND consent_type = p_consent_type
      AND (p_purpose IS NULL OR purpose = p_purpose)
      AND granted = true
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
