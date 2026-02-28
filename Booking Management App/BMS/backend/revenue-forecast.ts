// Revenue Forecast Edge Function
// Generate and manage revenue predictions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForecastRequest {
    action: "generate" | "get_forecast" | "get_trends" | "create_goal" | "get_goals" | "update_goal_progress";
    forecast_days?: number;
    date_range?: { start: string; end: string };
    goal_data?: {
        period_type: string;
        period_start: string;
        period_end: string;
        target_revenue: number;
        target_bookings?: number;
        notes?: string;
    };
    goal_id?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[REVENUE-FORECAST] ${step}${detailsStr}`);
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

        const body: ForecastRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "generate": {
                const { forecast_days = 30 } = body;

                // Generate forecasts using the database function
                const { data: forecasts, error } = await supabaseAdmin.rpc("generate_revenue_forecast", {
                    p_provider_id: user.id,
                    p_forecast_days: forecast_days,
                });

                if (error) throw error;

                logStep("Forecasts generated", { count: forecasts?.length || 0 });

                return new Response(
                    JSON.stringify({ success: true, forecasts }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_forecast": {
                const { date_range } = body;
                const startDate = date_range?.start || new Date().toISOString().split("T")[0];
                const endDate = date_range?.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

                const { data: forecasts, error } = await supabaseAdmin
                    .from("revenue_forecasts")
                    .select("*")
                    .eq("provider_id", user.id)
                    .gte("forecast_date", startDate)
                    .lte("forecast_date", endDate)
                    .order("forecast_date", { ascending: true });

                if (error) throw error;

                // Calculate summary
                const summary = {
                    total_predicted_revenue: forecasts?.reduce((sum, f) => sum + (f.predicted_revenue || 0), 0) || 0,
                    total_predicted_bookings: forecasts?.reduce((sum, f) => sum + (f.predicted_bookings || 0), 0) || 0,
                    average_confidence: forecasts?.reduce((sum, f) => sum + (f.confidence_level || 0), 0) / (forecasts?.length || 1) || 0,
                    days_forecasted: forecasts?.length || 0,
                };

                return new Response(
                    JSON.stringify({ forecasts, summary }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_trends": {
                const { date_range } = body;
                const startDate = date_range?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

                const { data: trends, error } = await supabaseAdmin
                    .from("revenue_trends")
                    .select("*")
                    .eq("provider_id", user.id)
                    .gte("period_date", startDate)
                    .order("period_date", { ascending: true });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ trends }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "create_goal": {
                const { goal_data } = body;

                if (!goal_data?.period_type || !goal_data?.period_start || !goal_data?.target_revenue) {
                    return new Response(
                        JSON.stringify({ error: "Goal period and target revenue required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: goal, error } = await supabaseAdmin
                    .from("revenue_goals")
                    .insert({
                        provider_id: user.id,
                        period_type: goal_data.period_type,
                        period_start: goal_data.period_start,
                        period_end: goal_data.period_end,
                        target_revenue: goal_data.target_revenue,
                        target_bookings: goal_data.target_bookings,
                        notes: goal_data.notes,
                    })
                    .select()
                    .single();

                if (error) throw error;

                logStep("Goal created", { goalId: goal.id });

                return new Response(
                    JSON.stringify({ success: true, goal }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_goals": {
                const { data: goals, error } = await supabaseAdmin
                    .from("revenue_goals")
                    .select("*")
                    .eq("provider_id", user.id)
                    .order("period_start", { ascending: false });

                if (error) throw error;

                // Update progress for in-progress goals
                for (const goal of goals?.filter(g => g.status === "in_progress") || []) {
                    await supabaseAdmin.rpc("update_revenue_goal_progress", { p_goal_id: goal.id });
                }

                // Refetch with updated progress
                const { data: updatedGoals } = await supabaseAdmin
                    .from("revenue_goals")
                    .select("*")
                    .eq("provider_id", user.id)
                    .order("period_start", { ascending: false });

                return new Response(
                    JSON.stringify({ goals: updatedGoals }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "update_goal_progress": {
                const { goal_id } = body;

                if (!goal_id) {
                    return new Response(
                        JSON.stringify({ error: "goal_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: goal, error } = await supabaseAdmin.rpc("update_revenue_goal_progress", {
                    p_goal_id: goal_id,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ goal }),
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
