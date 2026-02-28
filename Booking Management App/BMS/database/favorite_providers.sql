-- ============================================
-- TABLE: favorite_providers
-- Description: User's favorite/bookmarked providers
-- ============================================

CREATE TABLE public.favorite_providers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE (user_id, provider_id)
);

-- Enable RLS
ALTER TABLE public.favorite_providers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorite_providers FOR SELECT
USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
ON public.favorite_providers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
ON public.favorite_providers FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_favorite_providers_user_id ON public.favorite_providers(user_id);
CREATE INDEX idx_favorite_providers_provider_id ON public.favorite_providers(provider_id);
