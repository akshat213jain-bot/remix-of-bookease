// In-App Chat Edge Function
// Real-time messaging between providers and customers

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
    action: "get_conversations" | "get_messages" | "send_message" | "mark_read" | "get_or_create";
    conversation_id?: string;
    recipient_id?: string;
    appointment_id?: string;
    message?: string;
    message_type?: string;
    file_url?: string;
    file_name?: string;
    limit?: number;
    offset?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[IN-APP-CHAT] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Authorization required" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid authentication" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const body: ChatRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "get_conversations": {
                const { limit = 20, offset = 0 } = body;

                const { data: conversations, error, count } = await supabaseAdmin
                    .from("chat_conversations")
                    .select(`
            *,
            participant_1_profile:participant_1 (id, email, raw_user_meta_data),
            participant_2_profile:participant_2 (id, email, raw_user_meta_data)
          `, { count: "exact" })
                    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
                    .eq("status", "active")
                    .order("last_message_at", { ascending: false, nullsFirst: false })
                    .range(offset, offset + limit - 1);

                if (error) throw error;

                // Format conversations with other user info
                const formattedConversations = conversations?.map(conv => {
                    const isParticipant1 = conv.participant_1 === user.id;
                    const otherUser = isParticipant1 ? conv.participant_2_profile : conv.participant_1_profile;
                    const unreadCount = isParticipant1 ? conv.participant_1_unread : conv.participant_2_unread;

                    return {
                        id: conv.id,
                        other_user: {
                            id: otherUser?.id,
                            email: otherUser?.email,
                            name: otherUser?.raw_user_meta_data?.full_name || otherUser?.email,
                            avatar: otherUser?.raw_user_meta_data?.avatar_url,
                        },
                        last_message_at: conv.last_message_at,
                        last_message_preview: conv.last_message_preview,
                        unread_count: unreadCount,
                        appointment_id: conv.appointment_id,
                    };
                });

                return new Response(
                    JSON.stringify({
                        conversations: formattedConversations,
                        total_count: count,
                        pagination: { limit, offset, has_more: (count || 0) > offset + limit },
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_messages": {
                const { conversation_id, limit = 50, offset = 0 } = body;

                if (!conversation_id) {
                    return new Response(
                        JSON.stringify({ error: "conversation_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Verify user is part of conversation
                const { data: conv } = await supabaseAdmin
                    .from("chat_conversations")
                    .select("participant_1, participant_2")
                    .eq("id", conversation_id)
                    .single();

                if (!conv || (conv.participant_1 !== user.id && conv.participant_2 !== user.id)) {
                    return new Response(
                        JSON.stringify({ error: "Not authorized" }),
                        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: messages, error, count } = await supabaseAdmin
                    .from("chat_messages")
                    .select(`
            *,
            sender:sender_id (id, email, raw_user_meta_data)
          `, { count: "exact" })
                    .eq("conversation_id", conversation_id)
                    .eq("is_deleted", false)
                    .order("created_at", { ascending: false })
                    .range(offset, offset + limit - 1);

                if (error) throw error;

                return new Response(
                    JSON.stringify({
                        messages: messages?.reverse() || [],
                        total_count: count,
                        pagination: { limit, offset, has_more: (count || 0) > offset + limit },
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "send_message": {
                const { conversation_id, message, message_type = "text", file_url, file_name } = body;

                if (!conversation_id || (!message && !file_url)) {
                    return new Response(
                        JSON.stringify({ error: "conversation_id and message or file required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Verify user is part of conversation
                const { data: conv } = await supabaseAdmin
                    .from("chat_conversations")
                    .select("*")
                    .eq("id", conversation_id)
                    .single();

                if (!conv || (conv.participant_1 !== user.id && conv.participant_2 !== user.id)) {
                    return new Response(
                        JSON.stringify({ error: "Not authorized" }),
                        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Insert message
                const { data: newMessage, error } = await supabaseAdmin
                    .from("chat_messages")
                    .insert({
                        conversation_id,
                        sender_id: user.id,
                        message_type,
                        content: message,
                        file_url,
                        file_name,
                    })
                    .select(`
            *,
            sender:sender_id (id, email, raw_user_meta_data)
          `)
                    .single();

                if (error) throw error;

                // Send notification to other participant
                const recipientId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
                await supabaseAdmin.from("notifications").insert({
                    user_id: recipientId,
                    type: "chat_message",
                    title: "New Message",
                    message: message?.substring(0, 100) || "Sent a file",
                    data: { conversation_id, message_id: newMessage.id },
                });

                logStep("Message sent", { conversationId: conversation_id, messageId: newMessage.id });

                return new Response(
                    JSON.stringify({ success: true, message: newMessage }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "mark_read": {
                const { conversation_id } = body;

                if (!conversation_id) {
                    return new Response(
                        JSON.stringify({ error: "conversation_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: count, error } = await supabaseAdmin.rpc("mark_messages_read", {
                    p_conversation_id: conversation_id,
                    p_user_id: user.id,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, messages_marked: count }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_or_create": {
                const { recipient_id, appointment_id } = body;

                if (!recipient_id) {
                    return new Response(
                        JSON.stringify({ error: "recipient_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: conversationId, error } = await supabaseAdmin.rpc("get_or_create_conversation", {
                    p_user_1: user.id,
                    p_user_2: recipient_id,
                    p_appointment_id: appointment_id || null,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ conversation_id: conversationId }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid action" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }
    } catch (error) {
        logStep("Error", { error: error instanceof Error ? error.message : String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
