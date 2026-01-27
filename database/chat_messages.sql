-- ============================================
-- TABLE: chat_messages
-- Description: Individual chat messages with realtime enabled
-- ============================================

CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id),
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages FOR SELECT
USING (conversation_id IN (
    SELECT id FROM chat_conversations
    WHERE user_id = auth.uid()
    OR provider_id IN (
        SELECT id FROM provider_profiles WHERE user_id = auth.uid()
    )
));

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
        SELECT id FROM chat_conversations
        WHERE user_id = auth.uid()
        OR provider_id IN (
            SELECT id FROM provider_profiles WHERE user_id = auth.uid()
        )
    )
);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their own messages"
ON public.chat_messages FOR UPDATE
USING (sender_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_unread ON public.chat_messages(is_read) WHERE is_read = false;
