-- ============================================
-- TABLE: chat_conversations
-- Description: Chat threads between users and providers
-- ============================================

CREATE TABLE public.chat_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their conversations
CREATE POLICY "Users can view their conversations"
ON public.chat_conversations FOR SELECT
USING (auth.uid() = user_id);

-- Users can create conversations
CREATE POLICY "Users can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their conversations
CREATE POLICY "Users can update their conversations"
ON public.chat_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Providers can view their conversations
CREATE POLICY "Providers can view their conversations"
ON public.chat_conversations FOR SELECT
USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- Providers can update their conversations
CREATE POLICY "Providers can update their conversations"
ON public.chat_conversations FOR UPDATE
USING (provider_id IN (
    SELECT id FROM provider_profiles WHERE user_id = auth.uid()
));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_provider_id ON public.chat_conversations(provider_id);
CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC);
