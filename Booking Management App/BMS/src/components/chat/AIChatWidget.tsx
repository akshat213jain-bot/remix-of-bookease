import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, X, Bot, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface ChatResponse {
    conversation_id: string;
    message: string;
    quick_replies?: string[];
}

export const AIChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Send initial greeting
            setMessages([
                {
                    id: "welcome",
                    role: "assistant",
                    content: "Hi! 👋 I'm BookEase AI. How can I help you today?",
                    timestamp: new Date(),
                },
            ]);
            setQuickReplies(["Book an appointment", "View my bookings", "Need help"]);
        }
    }, [isOpen]);

    const sendMessage = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setQuickReplies([]);
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke<ChatResponse>("ai-chat", {
                body: {
                    message: text,
                    conversation_id: conversationId,
                },
            });

            if (error) throw error;

            if (data) {
                setConversationId(data.conversation_id);

                const assistantMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: data.message,
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, assistantMessage]);
                setQuickReplies(data.quick_replies || []);
            }
        } catch (error) {
            const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "Sorry, I'm having trouble right now. Please try again later.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Chat Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
                    "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                    isOpen && "hidden"
                )}
            >
                <MessageCircle className="h-6 w-6" />
            </Button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-background border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">BookEase AI</h3>
                                <p className="text-xs opacity-80">Always here to help</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 text-primary-foreground"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-2",
                                        message.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {message.role === "assistant" && (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                : "bg-muted rounded-bl-sm"
                                        )}
                                    >
                                        {message.content}
                                    </div>
                                    {message.role === "user" && (
                                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                            <User className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Quick Replies */}
                    {quickReplies.length > 0 && (
                        <div className="px-4 pb-2 flex flex-wrap gap-2">
                            {quickReplies.map((reply, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => sendMessage(reply)}
                                >
                                    {reply}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
