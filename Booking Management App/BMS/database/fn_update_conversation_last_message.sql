-- ============================================
-- FUNCTION: update_conversation_last_message
-- Description: Updates conversation's last_message_at when new message is sent
-- ============================================

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER
-- ============================================

CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- ============================================
-- NOTES
-- ============================================
-- - Keeps conversations sorted by most recent message
-- - Used for chat list ordering in the UI
