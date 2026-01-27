// AI Chat Edge Function
// Process user messages and generate AI responses

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
    message: string;
    conversation_id?: string;
    session_id?: string;
    context?: Record<string, unknown>;
}

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[AI-CHAT] ${step}${detailsStr}`);
}

// Simple AI response generation using OpenAI-compatible API
async function generateAIResponse(
    messages: ChatMessage[],
    apiKey: string
): Promise<string> {
    const systemPrompt = `You are BookEase AI, a helpful booking assistant for a service marketplace. You help users:
- Find and book services with providers
- Answer questions about appointments, payments, and cancellations
- Provide information about subscription plans and rewards
- Guide users through the booking process

Be friendly, concise, and helpful. If you don't know something specific about a user's booking, guide them to check their dashboard or contact support.

Key features of BookEase:
- Browse service providers by category
- Book appointments online with instant confirmation
- Multiple payment methods (cards, digital wallets)
- Loyalty points and referral rewards
- subscription plans for regular customers`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages,
            ],
            max_tokens: 300,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I'm sorry, I couldn't process your request.";
}

// Fallback responses when no API key is configured
function generateFallbackResponse(message: string): { content: string; quickReplies: string[] } {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("book") || lowerMessage.includes("appointment")) {
        return {
            content: "To book an appointment, browse our providers at the Providers page, select a service, and choose your preferred time slot. Would you like me to help you find a provider?",
            quickReplies: ["Find providers", "How booking works", "View my bookings"],
        };
    }

    if (lowerMessage.includes("cancel")) {
        return {
            content: "To cancel an appointment, go to your Dashboard, find the appointment, and click the cancel button. Please note our cancellation policy may apply for last-minute cancellations.",
            quickReplies: ["View my bookings", "Cancellation policy", "Reschedule instead"],
        };
    }

    if (lowerMessage.includes("pay") || lowerMessage.includes("payment")) {
        return {
            content: "We accept all major credit cards, debit cards, and digital wallets. Payment is securely processed through Stripe. You can also use gift cards or redeem loyalty points.",
            quickReplies: ["Payment methods", "My rewards", "Apply coupon"],
        };
    }

    if (lowerMessage.includes("refund")) {
        return {
            content: "Refunds are processed according to our refund policy. Typically, cancellations made 24+ hours in advance receive a full refund. Please check your email for refund confirmation.",
            quickReplies: ["Refund policy", "Contact support", "View my bookings"],
        };
    }

    if (lowerMessage.includes("subscription") || lowerMessage.includes("plan")) {
        return {
            content: "Our subscription plans offer great value with included appointments and discounts. Check out our Rewards page to see available plans and their benefits.",
            quickReplies: ["View plans", "My subscription", "Compare plans"],
        };
    }

    if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
        return {
            content: "I'm here to help! You can ask me about booking appointments, payments, cancellations, or rewards. For account-specific issues, please contact our support team.",
            quickReplies: ["Book appointment", "My account", "Contact support"],
        };
    }

    // Default greeting/general response
    return {
        content: "Hi! I'm BookEase AI, your booking assistant. How can I help you today? You can ask me about booking services, managing appointments, payments, or our rewards program.",
        quickReplies: ["Book an appointment", "View my bookings", "Explore rewards"],
    };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const openaiKey = Deno.env.get("OPENAI_API_KEY");

        const authHeader = req.headers.get("Authorization");
        let userId: string | null = null;

        if (authHeader) {
            const supabaseClient = createClient(supabaseUrl, supabaseKey, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: { user } } = await supabaseClient.auth.getUser();
            userId = user?.id || null;
        }

        const body: ChatRequest = await req.json();
        const { message, conversation_id, session_id, context } = body;

        if (!message) {
            return new Response(
                JSON.stringify({ error: "Message is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Processing chat", { userId, conversationId: conversation_id, messageLength: message.length });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get or create conversation
        let conversationId = conversation_id;
        if (!conversationId) {
            const { data: newConversation, error: createError } = await supabaseAdmin
                .from("chatbot_conversations")
                .insert({
                    user_id: userId,
                    session_id: session_id || crypto.randomUUID(),
                    context: context || {},
                })
                .select()
                .single();

            if (createError) throw createError;
            conversationId = newConversation.id;
        }

        // Save user message
        await supabaseAdmin.from("chatbot_messages").insert({
            conversation_id: conversationId,
            role: "user",
            content: message,
        });

        // Get conversation history (last 10 messages)
        const { data: history } = await supabaseAdmin
            .from("chatbot_messages")
            .select("role, content")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(10);

        const messages: ChatMessage[] = (history || []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }));

        let responseContent: string;
        let quickReplies: string[] = [];

        if (openaiKey) {
            // Use OpenAI API
            responseContent = await generateAIResponse(messages, openaiKey);
        } else {
            // Use fallback responses
            const fallback = generateFallbackResponse(message);
            responseContent = fallback.content;
            quickReplies = fallback.quickReplies;
        }

        // Save assistant response
        await supabaseAdmin.from("chatbot_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: responseContent,
        });

        // Update conversation timestamp
        await supabaseAdmin
            .from("chatbot_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);

        logStep("Response generated", { conversationId, responseLength: responseContent.length });

        return new Response(
            JSON.stringify({
                conversation_id: conversationId,
                message: responseContent,
                quick_replies: quickReplies,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        logStep("Error", { error: error instanceof Error ? error.message : String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
