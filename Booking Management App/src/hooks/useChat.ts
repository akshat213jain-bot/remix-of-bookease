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
          *,
          provider:provider_profiles(
            id,
            profession,
            user_id
          )
        `)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Enrich with profile info and last message
      const enrichedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          // Get provider profile
          let providerProfile = null;
          if (conv.provider) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", conv.provider.user_id)
              .maybeSingle();
            providerProfile = profile;
          }

          // Get user profile
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", conv.user_id)
            .maybeSingle();

          // Get last message
          const { data: lastMessage } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          return {
            ...conv,
            provider: conv.provider ? { ...conv.provider, profile: providerProfile } : undefined,
            user: userProfile,
            lastMessage,
            unreadCount: unreadCount || 0,
          };
        })
      );

      return enrichedConversations as ChatConversation[];
    },
    enabled: !!user?.id,
  });

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
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  // Subscribe to realtime messages
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

  // Combine fetched and realtime messages
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
