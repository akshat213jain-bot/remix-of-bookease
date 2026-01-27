// Streak Rewards Edge Function
// Manage user streaks and milestone rewards

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StreakRequest {
    action: "get_streaks" | "update_streak" | "check_milestones" | "use_freeze" | "get_definitions";
    streak_type?: string;
    activity_date?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[STREAK-REWARDS] ${step}${detailsStr}`);
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

        const body: StreakRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "get_definitions": {
                const { data: definitions, error } = await supabaseAdmin
                    .from("streak_definitions")
                    .select("*")
                    .eq("is_active", true)
                    .order("streak_type");

                if (error) throw error;

                return new Response(
                    JSON.stringify({ definitions }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_streaks": {
                const { streak_type } = body;

                let query = supabaseAdmin
                    .from("user_streaks")
                    .select("*")
                    .eq("user_id", user.id);

                if (streak_type) {
                    query = query.eq("streak_type", streak_type);
                }

                const { data: streaks, error } = await query;

                if (error) throw error;

                // Get milestone claims
                const { data: claims } = await supabaseAdmin
                    .from("streak_milestone_claims")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("claimed_at", { ascending: false });

                // Get available freezes
                const { data: freezes } = await supabaseAdmin
                    .from("streak_freezes")
                    .select("*")
                    .eq("user_id", user.id)
                    .gte("freeze_date", new Date().toISOString().split("T")[0]);

                // Check if any streak is at risk
                const atRiskStreaks = (streaks || []).filter(s => {
                    if (!s.last_activity_date) return false;
                    const daysSince = Math.floor((Date.now() - new Date(s.last_activity_date).getTime()) / (1000 * 60 * 60 * 24));
                    return daysSince >= 1 && s.current_streak > 0;
                });

                return new Response(
                    JSON.stringify({
                        streaks,
                        milestone_claims: claims,
                        active_freezes: freezes,
                        at_risk: atRiskStreaks,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "update_streak": {
                const { streak_type, activity_date } = body;

                if (!streak_type) {
                    return new Response(
                        JSON.stringify({ error: "streak_type required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: streak, error } = await supabaseAdmin.rpc("update_user_streak", {
                    p_user_id: user.id,
                    p_streak_type: streak_type,
                    p_activity_date: activity_date || new Date().toISOString().split("T")[0],
                });

                if (error) throw error;

                // Check for new milestones
                const { data: newMilestones } = await supabaseAdmin.rpc("check_streak_milestones", {
                    p_user_id: user.id,
                    p_streak_type: streak_type,
                });

                logStep("Streak updated", {
                    type: streak_type,
                    currentStreak: streak?.current_streak,
                    newMilestones: newMilestones?.length,
                });

                return new Response(
                    JSON.stringify({
                        success: true,
                        streak,
                        new_milestones: newMilestones,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "check_milestones": {
                const { streak_type } = body;

                if (!streak_type) {
                    return new Response(
                        JSON.stringify({ error: "streak_type required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: milestones, error } = await supabaseAdmin.rpc("check_streak_milestones", {
                    p_user_id: user.id,
                    p_streak_type: streak_type,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ milestones_awarded: milestones }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "use_freeze": {
                const { streak_type } = body;

                if (!streak_type) {
                    return new Response(
                        JSON.stringify({ error: "streak_type required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Check if user has points for freeze (100 points per freeze)
                const { data: loyalty } = await supabaseAdmin
                    .from("loyalty_points")
                    .select("current_points")
                    .eq("user_id", user.id)
                    .single();

                const freezeCost = 100;
                if ((loyalty?.current_points || 0) < freezeCost) {
                    return new Response(
                        JSON.stringify({ error: `Need ${freezeCost} points to freeze streak` }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Get user's streak to find the date to freeze
                const { data: streak } = await supabaseAdmin
                    .from("user_streaks")
                    .select("last_activity_date")
                    .eq("user_id", user.id)
                    .eq("streak_type", streak_type)
                    .single();

                if (!streak?.last_activity_date) {
                    return new Response(
                        JSON.stringify({ error: "No active streak to freeze" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const freezeDate = new Date(streak.last_activity_date);
                freezeDate.setDate(freezeDate.getDate() + 1);

                // Create freeze
                const { data: freeze, error: freezeError } = await supabaseAdmin
                    .from("streak_freezes")
                    .insert({
                        user_id: user.id,
                        streak_type,
                        freeze_date: freezeDate.toISOString().split("T")[0],
                        points_used: freezeCost,
                    })
                    .select()
                    .single();

                if (freezeError) throw freezeError;

                // Deduct points
                await supabaseAdmin
                    .from("loyalty_points")
                    .update({ current_points: (loyalty?.current_points || 0) - freezeCost })
                    .eq("user_id", user.id);

                logStep("Streak frozen", { type: streak_type, date: freezeDate });

                return new Response(
                    JSON.stringify({ success: true, freeze }),
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
