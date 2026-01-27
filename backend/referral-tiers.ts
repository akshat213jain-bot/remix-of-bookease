// Referral Tiers Edge Function
// Multi-level referral system

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReferralRequest {
    action: "get_tiers" | "get_my_status" | "apply_code" | "get_referrals" | "get_rewards";
    referral_code?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[REFERRAL-TIERS] ${step}${detailsStr}`);
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

        const body: ReferralRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "get_tiers": {
                const { data: tiers, error } = await supabaseAdmin
                    .from("referral_tiers")
                    .select("*")
                    .eq("is_active", true)
                    .order("tier_level");

                if (error) throw error;

                return new Response(
                    JSON.stringify({ tiers }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_my_status": {
                // Get or create referral status
                let { data: status, error } = await supabaseAdmin
                    .from("user_referral_status")
                    .select(`
            *,
            current_tier:current_tier_id (*),
            referred_by_user:referred_by (email, raw_user_meta_data)
          `)
                    .eq("user_id", user.id)
                    .single();

                if (!status) {
                    // Create referral status
                    const { data: firstTier } = await supabaseAdmin
                        .from("referral_tiers")
                        .select("id")
                        .eq("tier_level", 1)
                        .single();

                    const { data: newStatus } = await supabaseAdmin
                        .from("user_referral_status")
                        .insert({
                            user_id: user.id,
                            referral_code: await supabaseAdmin.rpc("generate_referral_code"),
                            current_tier_id: firstTier?.id,
                        })
                        .select(`
              *,
              current_tier:current_tier_id (*)
            `)
                        .single();

                    status = newStatus;
                }

                // Calculate progress to next tier
                const { data: nextTier } = await supabaseAdmin
                    .from("referral_tiers")
                    .select("*")
                    .gt("tier_level", status?.current_tier?.tier_level || 1)
                    .order("tier_level")
                    .limit(1)
                    .single();

                const progressToNextTier = nextTier
                    ? {
                        next_tier: nextTier,
                        referrals_needed: nextTier.min_referrals - (status?.successful_referrals || 0),
                        progress_percent: Math.min(100, ((status?.successful_referrals || 0) / nextTier.min_referrals) * 100),
                    }
                    : { next_tier: null, referrals_needed: 0, progress_percent: 100 };

                return new Response(
                    JSON.stringify({
                        status,
                        progress: progressToNextTier,
                        share_url: `https://bookease9.lovable.app/signup?ref=${status?.referral_code}`,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "apply_code": {
                const { referral_code } = body;

                if (!referral_code) {
                    return new Response(
                        JSON.stringify({ error: "referral_code required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: result, error } = await supabaseAdmin.rpc("process_referral_signup", {
                    p_referee_id: user.id,
                    p_referral_code: referral_code.toUpperCase(),
                });

                if (error) throw error;

                if (!result?.success) {
                    return new Response(
                        JSON.stringify({ success: false, error: result?.error }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                logStep("Referral applied", { code: referral_code, result });

                return new Response(
                    JSON.stringify(result),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_referrals": {
                const { data: referrals, error } = await supabaseAdmin
                    .from("referrals")
                    .select(`
            *,
            referee:referee_id (email, raw_user_meta_data)
          `)
                    .eq("referrer_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                // Group by status
                const stats = {
                    total: referrals?.length || 0,
                    pending: referrals?.filter(r => r.status === "pending").length || 0,
                    signed_up: referrals?.filter(r => r.status === "signed_up").length || 0,
                    completed: referrals?.filter(r => r.status === "completed").length || 0,
                    total_points_earned: referrals?.reduce((sum, r) => sum + (r.referrer_points_awarded || 0), 0) || 0,
                };

                return new Response(
                    JSON.stringify({ referrals, stats }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_rewards": {
                const { data: rewards, error } = await supabaseAdmin
                    .from("referral_rewards")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const totals = {
                    total_points: rewards?.reduce((sum, r) => sum + (r.points || 0), 0) || 0,
                    total_discounts: rewards?.reduce((sum, r) => sum + (r.discount_amount || 0), 0) || 0,
                };

                return new Response(
                    JSON.stringify({ rewards, totals }),
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
