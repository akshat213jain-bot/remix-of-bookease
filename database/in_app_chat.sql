-- =============================================
-- IN-APP CHAT (PROVIDER-CUSTOMER)
-- =============================================
-- Real-time messaging between providers and customers

-- Chat conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  participant_1_unread INTEGER DEFAULT 0,
  participant_2_unread INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'appointment', 'system')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  appointment_data JSONB, -- For appointment-related messages
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat message reactions
CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Chat typing indicators (ephemeral, for real-time)
CREATE TABLE IF NOT EXISTS public.chat_typing (
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Quick reply templates for providers
CREATE TABLE IF NOT EXISTS public.chat_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  shortcut TEXT, -- e.g., "/confirm" triggers this template
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_p1 ON public.chat_conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_p2 ON public.chat_conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_msg ON public.chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_templates_provider ON public.chat_templates(provider_id);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their conversations"
  ON public.chat_conversations FOR SELECT
  USING (auth.uid() IN (participant_1, participant_2));

CREATE POLICY "Users can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() IN (participant_1, participant_2));

CREATE POLICY "Users can update their conversations"
  ON public.chat_conversations FOR UPDATE
  USING (auth.uid() IN (participant_1, participant_2));

CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id
      AND auth.uid() IN (participant_1, participant_2)
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id
      AND auth.uid() IN (participant_1, participant_2)
    )
  );

CREATE POLICY "Users can edit/delete their own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can manage reactions"
  ON public.chat_reactions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Providers can manage their templates"
  ON public.chat_templates FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user_1 UUID,
  p_user_2 UUID,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_p1 UUID;
  v_p2 UUID;
BEGIN
  -- Normalize order (smaller UUID first)
  IF p_user_1 < p_user_2 THEN
    v_p1 := p_user_1;
    v_p2 := p_user_2;
  ELSE
    v_p1 := p_user_2;
    v_p2 := p_user_1;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.chat_conversations
  WHERE participant_1 = v_p1 AND participant_2 = v_p2;

  -- Create if not exists
  IF NOT FOUND THEN
    INSERT INTO public.chat_conversations (participant_1, participant_2, appointment_id)
    VALUES (v_p1, v_p2, p_appointment_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.chat_messages
  SET is_read = true, read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update unread count in conversation
  UPDATE public.chat_conversations
  SET 
    participant_1_unread = CASE WHEN participant_1 = p_user_id THEN 0 ELSE participant_1_unread END,
    participant_2_unread = CASE WHEN participant_2 = p_user_id THEN 0 ELSE participant_2_unread END
  WHERE id = p_conversation_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    participant_1_unread = CASE 
      WHEN participant_1 != NEW.sender_id THEN participant_1_unread + 1 
      ELSE participant_1_unread 
    END,
    participant_2_unread = CASE 
      WHEN participant_2 != NEW.sender_id THEN participant_2_unread + 1 
      ELSE participant_2_unread 
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_conversation_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();
