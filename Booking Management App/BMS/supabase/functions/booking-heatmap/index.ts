// Booking Heatmap Edge Function
// Analyze booking patterns by time slots

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeatmapRequest {
    action: "generate" | "get_heatmap" | "get_rankings" | "set_peak_hours";
    days_back?: number;
    service_id?: string;
    metric?: string;
    peak_hours?: Array<{
        day_of_week: number;
        start_hour: number;
        end_hour: number;
        price_multiplier: number;
    }>;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[BOOKING-HEATMAP] ${step}${detailsStr}`);
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

        const body: HeatmapRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "generate": {
                const { days_back = 90 } = body;

                const { data: heatmapData, error } = await supabaseAdmin.rpc("generate_booking_heatmap", {
                    p_provider_id: user.id,
                    p_days_back: days_back,
                });

                if (error) throw error;

                logStep("Heatmap generated", { dataPoints: heatmapData?.length || 0 });

                return new Response(
                    JSON.stringify({ success: true, data: heatmapData }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_heatmap": {
                const { service_id } = body;

                let query = supabaseAdmin
                    .from("booking_heatmap_data")
                    .select("*")
                    .eq("provider_id", user.id)
                    .order("day_of_week")
                    .order("hour_of_day");

                if (service_id) {
                    query = query.eq("service_id", service_id);
                } else {
                    query = query.is("service_id", null);
                }

                const { data: heatmapData, error } = await query;

                if (error) throw error;

                // Format as matrix for visualization
                const matrix: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
                const revenueMatrix: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

                for (const point of heatmapData || []) {
                    matrix[point.day_of_week][point.hour_of_day] = point.total_bookings;
                    revenueMatrix[point.day_of_week][point.hour_of_day] = point.total_revenue;
                }

                // Find peak slots
                const peakSlots = (heatmapData || [])
                    .sort((a, b) => b.total_bookings - a.total_bookings)
                    .slice(0, 5);

                return new Response(
                    JSON.stringify({
                        raw_data: heatmapData,
                        bookings_matrix: matrix,
                        revenue_matrix: revenueMatrix,
                        peak_slots: peakSlots,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_rankings": {
                const { metric = "bookings" } = body;

                const { data: rankings, error } = await supabaseAdmin.rpc("get_time_slot_rankings", {
                    p_provider_id: user.id,
                    p_metric: metric,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({
                        rankings,
                        best_slots: rankings?.slice(0, 5),
                        worst_slots: rankings?.slice(-5).reverse(),
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "set_peak_hours": {
                const { peak_hours } = body;

                if (!peak_hours || !Array.isArray(peak_hours)) {
                    return new Response(
                        JSON.stringify({ error: "peak_hours array required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Delete existing peak hours
                await supabaseAdmin
                    .from("peak_hours")
                    .delete()
                    .eq("provider_id", user.id);

                // Insert new peak hours
                const { data: newPeakHours, error } = await supabaseAdmin
                    .from("peak_hours")
                    .insert(
                        peak_hours.map(ph => ({
                            provider_id: user.id,
                            day_of_week: ph.day_of_week,
                            start_hour: ph.start_hour,
                            end_hour: ph.end_hour,
                            price_multiplier: ph.price_multiplier,
                        }))
                    )
                    .select();

                if (error) throw error;

                logStep("Peak hours updated", { count: newPeakHours?.length });

                return new Response(
                    JSON.stringify({ success: true, peak_hours: newPeakHours }),
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
