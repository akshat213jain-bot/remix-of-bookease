-- =============================================
-- PHOTO & DOCUMENT UPLOAD
-- =============================================
-- Support for uploading images and documents for appointments

-- File uploads table
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'document', 'video'
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  storage_path TEXT NOT NULL, -- Supabase storage path
  public_url TEXT,
  thumbnail_path TEXT, -- For images
  description TEXT,
  upload_context TEXT CHECK (upload_context IN ('booking_request', 'before_service', 'after_service', 'reference', 'message', 'review')),
  is_private BOOLEAN DEFAULT true,
  is_processed BOOLEAN DEFAULT false, -- For async processing
  metadata JSONB DEFAULT '{}', -- width, height, duration, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Review photos (link uploads to reviews)
CREATE TABLE IF NOT EXISTS public.review_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  file_upload_id UUID NOT NULL REFERENCES public.file_uploads(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  UNIQUE(review_id, file_upload_id)
);

-- Before/After galleries for providers
CREATE TABLE IF NOT EXISTS public.provider_galleries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  before_upload_id UUID REFERENCES public.file_uploads(id) ON DELETE SET NULL,
  after_upload_id UUID REFERENCES public.file_uploads(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_appointment ON public.file_uploads(appointment_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_context ON public.file_uploads(upload_context);
CREATE INDEX IF NOT EXISTS idx_review_photos_review ON public.review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_provider_galleries_provider ON public.provider_galleries(provider_id);

-- Enable RLS
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_galleries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_uploads
CREATE POLICY "Users can manage their own uploads"
  ON public.file_uploads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view uploads for their appointments"
  ON public.file_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE id = appointment_id 
      AND (user_id = auth.uid() OR provider_id = auth.uid())
    )
  );

CREATE POLICY "Public uploads are viewable"
  ON public.file_uploads FOR SELECT
  USING (is_private = false);

-- RLS Policies for review_photos
CREATE POLICY "Anyone can view review photos"
  ON public.review_photos FOR SELECT
  USING (true);

CREATE POLICY "Review authors can manage photos"
  ON public.review_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE id = review_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for provider_galleries
CREATE POLICY "Providers can manage their galleries"
  ON public.provider_galleries FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Anyone can view public galleries"
  ON public.provider_galleries FOR SELECT
  USING (is_public = true);

-- Function to get allowed file types
CREATE OR REPLACE FUNCTION get_allowed_file_types(p_context TEXT)
RETURNS TEXT[] AS $$
BEGIN
  CASE p_context
    WHEN 'booking_request' THEN
      RETURN ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    WHEN 'before_service', 'after_service' THEN
      RETURN ARRAY['image/jpeg', 'image/png', 'image/webp'];
    WHEN 'reference' THEN
      RETURN ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword'];
    WHEN 'message' THEN
      RETURN ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    WHEN 'review' THEN
      RETURN ARRAY['image/jpeg', 'image/png', 'image/webp'];
    ELSE
      RETURN ARRAY['image/jpeg', 'image/png', 'image/webp'];
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check file size limit
CREATE OR REPLACE FUNCTION check_file_size_limit(p_context TEXT, p_size_bytes INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_size INTEGER;
BEGIN
  CASE p_context
    WHEN 'booking_request', 'message' THEN
      v_max_size := 5 * 1024 * 1024; -- 5MB
    WHEN 'before_service', 'after_service', 'review' THEN
      v_max_size := 10 * 1024 * 1024; -- 10MB
    WHEN 'reference' THEN
      v_max_size := 20 * 1024 * 1024; -- 20MB
    ELSE
      v_max_size := 5 * 1024 * 1024; -- 5MB default
  END CASE;

  RETURN p_size_bytes <= v_max_size;
END;
$$ LANGUAGE plpgsql;
