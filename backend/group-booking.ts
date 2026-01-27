// Create Group Booking Edge Function
// Create and manage group appointments

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateGroupRequest {
    action: "create" | "join" | "leave" | "confirm" | "get";
    appointment_id?: string;
    group_id?: string;
    share_code?: string;
    title?: string;
    description?: string;
    max_participants?: number;
    is_public?: boolean;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[GROUP-BOOKING] ${step}${detailsStr}`);
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

        const body: CreateGroupRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "create": {
                const { appointment_id, title, description, max_participants, is_public } = body;

                if (!appointment_id) {
                    return new Response(
                        JSON.stringify({ error: "appointment_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Verify appointment belongs to user
                const { data: appointment } = await supabaseAdmin
                    .from("appointments")
                    .select("*")
                    .eq("id", appointment_id)
                    .eq("user_id", user.id)
                    .single();

                if (!appointment) {
                    return new Response(
                        JSON.stringify({ error: "Appointment not found or not yours" }),
                        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Create group booking
                const { data: group, error: groupError } = await supabaseAdmin
                    .from("group_bookings")
                    .insert({
                        appointment_id,
                        organizer_id: user.id,
                        title: title || "Group Appointment",
                        description,
                        max_participants: max_participants || 5,
                        is_public: is_public || false,
                    })
                    .select()
                    .single();

                if (groupError) throw groupError;

                // Mark appointment as group
                await supabaseAdmin
                    .from("appointments")
                    .update({ is_group: true })
                    .eq("id", appointment_id);

                // Add organizer as first participant
                await supabaseAdmin
                    .from("group_booking_participants")
                    .insert({
                        group_booking_id: group.id,
                        user_id: user.id,
                        status: "confirmed",
                    });

                logStep("Group created", { groupId: group.id, shareCode: group.share_code });

                return new Response(
                    JSON.stringify({ success: true, group }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "join": {
                const { share_code, group_id } = body;

                let groupQuery = supabaseAdmin.from("group_bookings").select("*");
                if (share_code) {
                    groupQuery = groupQuery.eq("share_code", share_code.toUpperCase());
                } else if (group_id) {
                    groupQuery = groupQuery.eq("id", group_id);
                } else {
                    return new Response(
                        JSON.stringify({ error: "share_code or group_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: group } = await groupQuery.single();

                if (!group) {
                    return new Response(
                        JSON.stringify({ error: "Group not found" }),
                        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                if (group.status !== "open") {
                    return new Response(
                        JSON.stringify({ error: "Group is no longer accepting participants" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Check if already a participant
                const { data: existing } = await supabaseAdmin
                    .from("group_booking_participants")
                    .select("id")
                    .eq("group_booking_id", group.id)
                    .eq("user_id", user.id)
                    .single();

                if (existing) {
                    return new Response(
                        JSON.stringify({ error: "Already a participant" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Check max participants
                const { count } = await supabaseAdmin
                    .from("group_booking_participants")
                    .select("*", { count: "exact", head: true })
                    .eq("group_booking_id", group.id)
                    .neq("status", "declined");

                if ((count || 0) >= group.max_participants) {
                    return new Response(
                        JSON.stringify({ error: "Group is full" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Add participant
                const { data: participant, error: joinError } = await supabaseAdmin
                    .from("group_booking_participants")
                    .insert({
                        group_booking_id: group.id,
                        user_id: user.id,
                        status: "pending",
                    })
                    .select()
                    .single();

                if (joinError) throw joinError;

                // Notify organizer
                await supabaseAdmin.from("notifications").insert({
                    user_id: group.organizer_id,
                    type: "group_join",
                    title: "New Group Member",
                    message: "Someone has requested to join your group booking.",
                    data: { group_id: group.id },
                });

                logStep("Joined group", { groupId: group.id, participantId: participant.id });

                return new Response(
                    JSON.stringify({ success: true, participant, group }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "leave": {
                const { group_id } = body;

                if (!group_id) {
                    return new Response(
                        JSON.stringify({ error: "group_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { error: leaveError } = await supabaseAdmin
                    .from("group_booking_participants")
                    .update({ status: "cancelled" })
                    .eq("group_booking_id", group_id)
                    .eq("user_id", user.id);

                if (leaveError) throw leaveError;

                logStep("Left group", { groupId: group_id });

                return new Response(
                    JSON.stringify({ success: true }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get": {
                const { group_id, share_code } = body;

                let groupQuery = supabaseAdmin
                    .from("group_bookings")
                    .select(`
            *,
            appointments (*),
            group_booking_participants (
              *,
              profiles:user_id (full_name, avatar_url)
            )
          `);

                if (share_code) {
                    groupQuery = groupQuery.eq("share_code", share_code.toUpperCase());
                } else if (group_id) {
                    groupQuery = groupQuery.eq("id", group_id);
                } else {
                    return new Response(
                        JSON.stringify({ error: "group_id or share_code required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: group, error: getError } = await groupQuery.single();

                if (getError || !group) {
                    return new Response(
                        JSON.stringify({ error: "Group not found" }),
                        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                return new Response(
                    JSON.stringify(group),
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
