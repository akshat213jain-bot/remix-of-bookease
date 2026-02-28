import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  provider_id: string;
  last_message_at: string;
  created_at: string;
  provider?: {
    id: string;
    profession: string;
    user_id: string;
    profile?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

// Fix #7: Batch all enrichment queries instead of N+1
export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["chat-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          id, user_id, provider_id, last_message_at, created_at,
          provider:provider_profiles(
            id,
            profession,
            user_id
          )
        `)
        .order("last_message_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Collect all user_ids we need profiles for (batch)
      const allUserIds = new Set<string>();
      const conversationIds: string[] = [];
      data.forEach((conv) => {
        allUserIds.add(conv.user_id);
        if (conv.provider?.user_id) allUserIds.add(conv.provider.user_id);
        conversationIds.push(conv.id);
      });

      // Batch fetch all profiles at once
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", Array.from(allUserIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Batch fetch last messages for all conversations using a single query
      // We'll get the latest message per conversation by fetching recent messages and deduping
      const { data: recentMessages } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, sender_id, message, is_read, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(500);

      const lastMessageMap = new Map<string, ChatMessage>();
      const unreadCountMap = new Map<string, number>();

      // Initialize unread counts
      conversationIds.forEach(id => unreadCountMap.set(id, 0));

      (recentMessages || []).forEach((msg) => {
        // Track last message per conversation
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg as ChatMessage);
        }
        // Count unread messages not from current user
        if (!msg.is_read && msg.sender_id !== user.id) {
          unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) || 0) + 1);
        }
      });

      return data.map((conv) => ({
        ...conv,
        provider: conv.provider ? {
          ...conv.provider,
          profile: profileMap.get(conv.provider.user_id) || null,
        } : undefined,
        user: profileMap.get(conv.user_id) || null,
        lastMessage: lastMessageMap.get(conv.id) || null,
        unreadCount: unreadCountMap.get(conv.id) || 0,
      })) as ChatConversation[];
    },
    enabled: !!user?.id,
  });

  // Fix #15: Check for existing conversation before creating (dedup already exists)
  const createConversationMutation = useMutation({
    mutationFn: async (providerId: string) => {
      if (!user?.id) throw new Error("Must be logged in");

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider_id", providerId)
        .maybeSingle();

      if (existing) return existing.id;

      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, provider_id: providerId })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    conversations,
    isLoadingConversations,
    createConversation: createConversationMutation.mutateAsync,
  };
};

export const useChatMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, sender_id, message, is_read, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setRealtimeMessages((prev) => [...prev, payload.new as ChatMessage]);
          queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const allMessages = [...messages, ...realtimeMessages.filter(
    (rm) => !messages.some((m) => m.id === rm.id)
  )];

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.id || !conversationId) throw new Error("Invalid state");

      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !conversationId) return;

      const { error } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  return {
    messages: allMessages,
    isLoading,
    sendMessage: sendMessageMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    isSending: sendMessageMutation.isPending,
  };
};
