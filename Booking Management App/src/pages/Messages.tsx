import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatConversation } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle } from "lucide-react";

const Messages = () => {
  const { role } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);

  const getRecipientName = (conv: ChatConversation) => {
    if (role === "provider") {
      return conv.user?.full_name || "Unknown User";
    }
    return conv.provider?.profile?.full_name || "Unknown Provider";
  };

  const getRecipientAvatar = (conv: ChatConversation) => {
    if (role === "provider") {
      return conv.user?.avatar_url;
    }
    return conv.provider?.profile?.avatar_url;
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              Chat with your {role === "provider" ? "patients" : "providers"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ChatList
              onSelectConversation={setSelectedConversation}
              selectedId={selectedConversation?.id}
            />
          </div>
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <div className="h-[600px]">
                <ChatWindow
                  conversationId={selectedConversation.id}
                  recipientName={getRecipientName(selectedConversation)}
                  recipientAvatar={getRecipientAvatar(selectedConversation)}
                  onClose={() => setSelectedConversation(null)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
