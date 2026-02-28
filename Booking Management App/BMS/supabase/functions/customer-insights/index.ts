// Customer Insights Edge Function
// Analytics and insights for providers

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightsRequest {
    action: "dashboard" | "customers" | "segments" | "create_segment" | "calculate_metrics";
    customer_id?: string;
    segment_id?: string;
    segment_data?: {
        name: string;
        description?: string;
        criteria: Record<string, unknown>;
        color?: string;
    };
    date_range?: {
        start: string;
        end: string;
    };
    limit?: number;
    offset?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[CUSTOMER-INSIGHTS] ${step}${detailsStr}`);
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

        const body: InsightsRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "dashboard": {
                // Get provider dashboard stats
                const { data: stats, error } = await supabaseAdmin.rpc("get_provider_dashboard_stats", {
                    p_provider_id: user.id,
                });

                if (error) throw error;

                // Get recent analytics
                const { data: recentAnalytics } = await supabaseAdmin
                    .from("provider_analytics")
                    .select("*")
                    .eq("provider_id", user.id)
                    .order("date", { ascending: false })
                    .limit(7);

                // Get booking trends
                const { data: trends } = await supabaseAdmin
                    .from("appointments")
                    .select("start_time, total_price, status")
                    .eq("provider_id", user.id)
                    .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                    .order("start_time", { ascending: true });

                return new Response(
                    JSON.stringify({
                        stats: stats?.[0] || {},
                        recent_analytics: recentAnalytics || [],
                        booking_trends: trends || [],
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "customers": {
                const { limit = 20, offset = 0 } = body;

                // Get customer metrics with profile info
                const { data: customers, error, count } = await supabaseAdmin
                    .from("customer_metrics")
                    .select(`
            *,
            customer:customer_id (
              id,
              email,
              raw_user_meta_data
            )
          `, { count: "exact" })
                    .eq("provider_id", user.id)
                    .order("total_spent", { ascending: false })
                    .range(offset, offset + limit - 1);

                if (error) throw error;

                return new Response(
                    JSON.stringify({
                        customers,
                        total_count: count,
                        pagination: { limit, offset, has_more: (count || 0) > offset + limit },
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "segments": {
                const { data: segments, error } = await supabaseAdmin
                    .from("customer_segments")
                    .select(`
            *,
            members:customer_segment_members(count)
          `)
                    .eq("provider_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ segments }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "create_segment": {
                const { segment_data } = body;

                if (!segment_data?.name || !segment_data?.criteria) {
                    return new Response(
                        JSON.stringify({ error: "Segment name and criteria required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: segment, error } = await supabaseAdmin
                    .from("customer_segments")
                    .insert({
                        provider_id: user.id,
                        name: segment_data.name,
                        description: segment_data.description,
                        criteria: segment_data.criteria,
                        color: segment_data.color || "#6366f1",
                    })
                    .select()
                    .single();

                if (error) throw error;

                logStep("Segment created", { segmentId: segment.id });

                return new Response(
                    JSON.stringify({ success: true, segment }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "calculate_metrics": {
                const { customer_id } = body;

                if (!customer_id) {
                    return new Response(
                        JSON.stringify({ error: "customer_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: metrics, error } = await supabaseAdmin.rpc("calculate_customer_metrics", {
                    p_provider_id: user.id,
                    p_customer_id: customer_id,
                });

                if (error) throw error;

                // Upsert the calculated metrics
                if (metrics) {
                    await supabaseAdmin
                        .from("customer_metrics")
                        .upsert(metrics, { onConflict: "provider_id,customer_id" });
                }

                return new Response(
                    JSON.stringify({ metrics }),
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
