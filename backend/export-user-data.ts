// Export User Data Edge Function
// GDPR-compliant data export for users

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[EXPORT-USER-DATA] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Get user from auth header
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

        logStep("Exporting data for user", { userId: user.id });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Collect all user data
        const exportData: Record<string, unknown> = {
            export_date: new Date().toISOString(),
            user_id: user.id,
            email: user.email,
        };

        // Profile data
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();
        exportData.profile = profile;

        // Appointments
        const { data: appointments } = await supabaseAdmin
            .from("appointments")
            .select("*")
            .eq("user_id", user.id);
        exportData.appointments = appointments;

        // Reviews given
        const { data: reviewsGiven } = await supabaseAdmin
            .from("reviews")
            .select("*")
            .eq("user_id", user.id);
        exportData.reviews_given = reviewsGiven;

        // Favorites
        const { data: favorites } = await supabaseAdmin
            .from("favorites")
            .select("*")
            .eq("user_id", user.id);
        exportData.favorites = favorites;

        // Notifications
        const { data: notifications } = await supabaseAdmin
            .from("notifications")
            .select("*")
            .eq("user_id", user.id);
        exportData.notifications = notifications;

        // Subscriptions
        const { data: subscriptions } = await supabaseAdmin
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", user.id);
        exportData.subscriptions = subscriptions;

        // Loyalty points
        const { data: loyaltyPoints } = await supabaseAdmin
            .from("loyalty_points")
            .select("*")
            .eq("user_id", user.id);
        exportData.loyalty_points = loyaltyPoints;

        // Referrals
        const { data: referrals } = await supabaseAdmin
            .from("referrals")
            .select("*")
            .or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`);
        exportData.referrals = referrals;

        // Push subscriptions
        const { data: pushSubs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", user.id);
        exportData.push_subscriptions = pushSubs;

        // Coupon uses
        const { data: couponUses } = await supabaseAdmin
            .from("coupon_uses")
            .select("*")
            .eq("user_id", user.id);
        exportData.coupon_uses = couponUses;

        // If user is a provider, include provider data
        if (profile?.role === "provider") {
            const { data: providerProfile } = await supabaseAdmin
                .from("provider_profiles")
                .select("*")
                .eq("user_id", user.id)
                .single();
            exportData.provider_profile = providerProfile;

            const { data: services } = await supabaseAdmin
                .from("services")
                .select("*")
                .eq("provider_id", user.id);
            exportData.services = services;

            const { data: availability } = await supabaseAdmin
                .from("provider_availability")
                .select("*")
                .eq("provider_id", user.id);
            exportData.availability = availability;

            const { data: earnings } = await supabaseAdmin
                .from("provider_earnings")
                .select("*")
                .eq("provider_id", user.id);
            exportData.earnings = earnings;

            const { data: reviewsReceived } = await supabaseAdmin
                .from("reviews")
                .select("*")
                .eq("provider_id", user.id);
            exportData.reviews_received = reviewsReceived;
        }

        // Create audit log
        await supabaseAdmin.rpc("create_audit_log", {
            p_user_id: user.id,
            p_action: "data_export",
            p_resource_type: "user",
            p_resource_id: user.id,
            p_metadata: { tables_exported: Object.keys(exportData).length },
        });

        logStep("Data export complete", { tables: Object.keys(exportData).length });

        return new Response(
            JSON.stringify(exportData, null, 2),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                    "Content-Disposition": `attachment; filename="bookease-data-export-${user.id}.json"`,
                },
            }
        );
    } catch (error) {
        logStep("Error", { error: error instanceof Error ? error.message : String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
