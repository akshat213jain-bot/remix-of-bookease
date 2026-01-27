-- =============================================
-- AI CHATBOT CONVERSATIONS
-- =============================================
-- Stores chat conversations with AI assistant

-- Chatbot conversations table
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- For anonymous users
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
  escalated_to UUID REFERENCES auth.users(id), -- Provider/Admin for escalation
  context JSONB DEFAULT '{}', -- Store booking context, user preferences
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chatbot messages table
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store intent, entities, confidence scores
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quick replies / suggested actions
CREATE TABLE IF NOT EXISTS public.chatbot_quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_intent TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  action_type TEXT, -- 'link', 'booking', 'faq', 'escalate'
  action_data JSONB,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user ON public.chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON public.chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation ON public.chatbot_messages(conversation_id, created_at);

-- Enable RLS
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_quick_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own conversations"
  ON public.chatbot_conversations FOR SELECT
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can create their own conversations"
  ON public.chatbot_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view messages in their conversations"
  ON public.chatbot_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR c.session_id = current_setting('app.session_id', true))
    )
  );

CREATE POLICY "Anyone can view quick replies"
  ON public.chatbot_quick_replies FOR SELECT
  USING (is_active = true);

-- Insert default quick replies
INSERT INTO public.chatbot_quick_replies (trigger_intent, reply_text, action_type, action_data, priority) VALUES
  ('greeting', 'Book an appointment', 'link', '{"url": "/providers"}', 1),
  ('greeting', 'View my bookings', 'link', '{"url": "/dashboard"}', 2),
  ('greeting', 'Find a provider', 'link', '{"url": "/providers"}', 3),
  ('booking_help', 'How to book', 'faq', '{"answer": "Browse providers, select a service, choose a time slot, and confirm your booking."}', 1),
  ('payment_help', 'Payment methods', 'faq', '{"answer": "We accept all major credit cards, debit cards, and digital wallets."}', 1),
  ('cancellation', 'Cancel booking', 'link', '{"url": "/dashboard"}', 1),
  ('escalate', 'Talk to a human', 'escalate', '{}', 1)
ON CONFLICT DO NOTHING;
