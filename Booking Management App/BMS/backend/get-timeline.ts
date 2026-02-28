// Get Timeline Events Edge Function
// Retrieve user's activity timeline

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimelineRequest {
    limit?: number;
    offset?: number;
    event_types?: string[];
    start_date?: string;
    end_date?: string;
    include_summary?: boolean;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[GET-TIMELINE] ${step}${detailsStr}`);
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

        const body: TimelineRequest = await req.json().catch(() => ({}));
        const {
            limit = 20,
            offset = 0,
            event_types,
            start_date,
            end_date,
            include_summary = false,
        } = body;

        logStep("Fetching timeline", { userId: user.id, limit, offset });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Build query
        let query = supabaseAdmin
            .from("timeline_events")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (event_types && event_types.length > 0) {
            query = query.in("event_type", event_types);
        }

        if (start_date) {
            query = query.gte("created_at", start_date);
        }

        if (end_date) {
            query = query.lte("created_at", end_date);
        }

        const { data: events, error: eventsError, count } = await query;

        if (eventsError) throw eventsError;

        // Group events by date for easier display
        const groupedEvents: Record<string, typeof events> = {};
        for (const event of events || []) {
            const date = new Date(event.created_at).toISOString().split("T")[0];
            if (!groupedEvents[date]) {
                groupedEvents[date] = [];
            }
            groupedEvents[date].push(event);
        }

        let summary = null;
        if (include_summary) {
            const { data: summaryData } = await supabaseAdmin.rpc("get_user_service_summary", {
                p_user_id: user.id,
            });
            summary = summaryData?.[0] || null;
        }

        // Get unread count
        const { count: unreadCount } = await supabaseAdmin
            .from("timeline_events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        logStep("Timeline fetched", { eventCount: events?.length, totalCount: count });

        return new Response(
            JSON.stringify({
                events,
                grouped_events: groupedEvents,
                total_count: count,
                unread_count: unreadCount || 0,
                summary,
                pagination: {
                    limit,
                    offset,
                    has_more: (count || 0) > offset + limit,
                },
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
