// Check Badge Eligibility Edge Function
// Awards badges to users based on their achievements

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BadgeAward {
    badge_id: string;
    badge_name: string;
    badge_icon: string;
    points: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[CHECK-BADGES] ${step}${detailsStr}`);
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

        logStep("Checking badges for user", { userId: user.id });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get all active badges
        const { data: badges, error: badgesError } = await supabaseAdmin
            .from("badges")
            .select("*")
            .eq("is_active", true);

        if (badgesError) throw badgesError;

        // Get user's existing badges
        const { data: existingBadges } = await supabaseAdmin
            .from("user_badges")
            .select("badge_id")
            .eq("user_id", user.id);

        const earnedBadgeIds = new Set(existingBadges?.map((b) => b.badge_id) || []);

        // Get user stats
        const [
            { count: bookingsCount },
            { count: reviewsCount },
            { count: referralsCount },
            { data: streakData },
        ] = await Promise.all([
            supabaseAdmin
                .from("appointments")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("status", "completed"),
            supabaseAdmin
                .from("reviews")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id),
            supabaseAdmin
                .from("referrals")
                .select("*", { count: "exact", head: true })
                .eq("referrer_id", user.id)
                .eq("status", "completed"),
            supabaseAdmin
                .from("user_streaks")
                .select("current_streak")
                .eq("user_id", user.id)
                .single(),
        ]);

        const stats: Record<string, number> = {
            bookings_count: bookingsCount || 0,
            reviews_count: reviewsCount || 0,
            referrals_count: referralsCount || 0,
            streak_days: streakData?.current_streak || 0,
        };

        logStep("User stats", stats);

        // Check and award new badges
        const newBadges: BadgeAward[] = [];

        for (const badge of badges || []) {
            if (earnedBadgeIds.has(badge.id)) continue;

            const userValue = stats[badge.criteria_type] || 0;
            if (userValue >= badge.criteria_value) {
                // Award badge
                const { error: awardError } = await supabaseAdmin
                    .from("user_badges")
                    .insert({
                        user_id: user.id,
                        badge_id: badge.id,
                    });

                if (!awardError) {
                    newBadges.push({
                        badge_id: badge.id,
                        badge_name: badge.name,
                        badge_icon: badge.icon,
                        points: badge.points_reward,
                    });

                    // Award points
                    if (badge.points_reward > 0) {
                        await supabaseAdmin.from("loyalty_points").insert({
                            user_id: user.id,
                            points: badge.points_reward,
                            source: "badge",
                            description: `Earned badge: ${badge.name}`,
                        });
                    }

                    // Create notification
                    await supabaseAdmin.from("notifications").insert({
                        user_id: user.id,
                        type: "badge_earned",
                        title: "New Badge Earned! 🎉",
                        message: `Congratulations! You've earned the "${badge.name}" badge!`,
                        data: { badge_id: badge.id, badge_name: badge.name, badge_icon: badge.icon },
                    });

                    logStep("Badge awarded", { badgeName: badge.name, points: badge.points_reward });
                }
            }
        }

        // Get all user badges for response
        const { data: allUserBadges } = await supabaseAdmin
            .from("user_badges")
            .select(`
        badge_id,
        earned_at,
        badges (name, description, icon, category, points_reward)
      `)
            .eq("user_id", user.id)
            .order("earned_at", { ascending: false });

        return new Response(
            JSON.stringify({
                new_badges: newBadges,
                total_badges: allUserBadges?.length || 0,
                all_badges: allUserBadges,
                stats,
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
