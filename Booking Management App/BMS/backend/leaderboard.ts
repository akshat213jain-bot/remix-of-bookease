// Leaderboard Edge Function
// Gamification leaderboards

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaderboardRequest {
    action: "list" | "get" | "update" | "my_rank" | "claim_reward";
    leaderboard_id?: string;
    limit?: number;
    reward_id?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[LEADERBOARD] ${step}${detailsStr}`);
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

        const body: LeaderboardRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "list": {
                const { data: leaderboards, error } = await supabaseAdmin
                    .from("leaderboards")
                    .select("*")
                    .eq("is_active", true)
                    .order("name");

                if (error) throw error;

                return new Response(
                    JSON.stringify({ leaderboards }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get": {
                const { leaderboard_id, limit = 10 } = body;

                if (!leaderboard_id) {
                    return new Response(
                        JSON.stringify({ error: "leaderboard_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Get leaderboard info
                const { data: leaderboard } = await supabaseAdmin
                    .from("leaderboards")
                    .select("*")
                    .eq("id", leaderboard_id)
                    .single();

                // Get rankings
                const { data: rankings, error } = await supabaseAdmin.rpc("get_leaderboard", {
                    p_leaderboard_id: leaderboard_id,
                    p_limit: limit,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ leaderboard, rankings }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "update": {
                const { leaderboard_id } = body;

                if (!leaderboard_id) {
                    return new Response(
                        JSON.stringify({ error: "leaderboard_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: count, error } = await supabaseAdmin.rpc("update_leaderboard", {
                    p_leaderboard_id: leaderboard_id,
                });

                if (error) throw error;

                logStep("Leaderboard updated", { entriesUpdated: count });

                return new Response(
                    JSON.stringify({ success: true, entries_updated: count }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "my_rank": {
                const { leaderboard_id } = body;

                // Get user's rank across all or specific leaderboard
                let query = supabaseAdmin
                    .from("leaderboard_entries")
                    .select(`
            *,
            leaderboards (name, metric, period_type)
          `)
                    .eq("user_id", user.id)
                    .order("rank");

                if (leaderboard_id) {
                    query = query.eq("leaderboard_id", leaderboard_id);
                }

                const { data: entries, error } = await query;

                if (error) throw error;

                // Get unclaimed rewards
                const { data: rewards } = await supabaseAdmin
                    .from("leaderboard_rewards")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("claimed", false);

                return new Response(
                    JSON.stringify({
                        rankings: entries,
                        unclaimed_rewards: rewards,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "claim_reward": {
                const { reward_id } = body;

                if (!reward_id) {
                    return new Response(
                        JSON.stringify({ error: "reward_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Get reward
                const { data: reward, error: rewardError } = await supabaseAdmin
                    .from("leaderboard_rewards")
                    .select("*")
                    .eq("id", reward_id)
                    .eq("user_id", user.id)
                    .eq("claimed", false)
                    .single();

                if (rewardError || !reward) {
                    return new Response(
                        JSON.stringify({ error: "Reward not found or already claimed" }),
                        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Claim reward
                await supabaseAdmin
                    .from("leaderboard_rewards")
                    .update({ claimed: true, claimed_at: new Date().toISOString() })
                    .eq("id", reward_id);

                // Award points
                if (reward.reward_value && reward.reward_type === "points") {
                    await supabaseAdmin
                        .from("loyalty_points")
                        .update({
                            current_points: supabaseAdmin.rpc("increment", { x: reward.reward_value }),
                            total_points: supabaseAdmin.rpc("increment", { x: reward.reward_value }),
                        })
                        .eq("user_id", user.id);
                }

                logStep("Reward claimed", { rewardId: reward_id, value: reward.reward_value });

                return new Response(
                    JSON.stringify({ success: true, reward }),
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
