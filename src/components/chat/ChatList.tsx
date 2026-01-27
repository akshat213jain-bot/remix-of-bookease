import { MessageCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useChat, ChatConversation } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChatListProps {
  onSelectConversation: (conversation: ChatConversation) => void;
  selectedId?: string;
}

export const ChatList = ({ onSelectConversation, selectedId }: ChatListProps) => {
  const { user, role } = useAuth();
  const { conversations, isLoadingConversations } = useChat();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (conv: ChatConversation) => {
    if (role === "provider") {
      return conv.user?.full_name || "Unknown User";
    }
    return conv.provider?.profile?.full_name || "Unknown Provider";
  };

  const getDisplayAvatar = (conv: ChatConversation) => {
    if (role === "provider") {
      return conv.user?.avatar_url;
    }
    return conv.provider?.profile?.avatar_url;
  };

  if (isLoadingConversations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages ({conversations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No conversations yet</p>
            <p className="text-sm mt-1">
              Start chatting with {role === "provider" ? "patients" : "providers"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                  selectedId === conv.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getDisplayAvatar(conv) || ""} />
                    <AvatarFallback>
                      {getInitials(getDisplayName(conv))}
                    </AvatarFallback>
                  </Avatar>
                  {(conv.unreadCount || 0) > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                      variant="destructive"
                    >
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{getDisplayName(conv)}</p>
                    {conv.lastMessage && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage.sender_id === user?.id && "You: "}
                      {conv.lastMessage.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
