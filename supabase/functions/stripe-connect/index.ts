/**
 * Stripe Connect Edge Function
 * 
 * Manages Stripe Connect accounts for providers:
 * - get_account_status: Check provider's Stripe account status
 * - create_account_link: Generate onboarding URL
 * - create_login_link: Generate dashboard URL
 * 
 * Deployed location: supabase/functions/stripe-connect/index.ts
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
    console.log(`[STRIPE-CONNECT] ${step}`, details ? JSON.stringify(details) : "");
};

interface ActionRequest {
    action: "get_account_status" | "create_account_link" | "create_login_link";
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

        if (!stripeSecretKey) {
            logStep("Error: STRIPE_SECRET_KEY not configured");
            return new Response(
                JSON.stringify({ error: "Payment service not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Authenticate user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Authorization required" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

        if (userError || !userData.user) {
            logStep("Auth error", { error: userError?.message });
            return new Response(
                JSON.stringify({ error: "User not authenticated" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const userId = userData.user.id;
        logStep("Authenticated user", { userId });

        // Parse request body
        const body: ActionRequest = await req.json();
        const { action } = body;

        if (!action) {
            return new Response(
                JSON.stringify({ error: "Action is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Stripe
        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2025-08-27.basil",
        });

        // Get provider profile with admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: providerProfile, error: profileError } = await supabaseAdmin
            .from("provider_profiles")
            .select("id, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled")
            .eq("user_id", userId)
            .maybeSingle();

        if (profileError) {
            logStep("Profile fetch error", { error: profileError.message });
            return new Response(
                JSON.stringify({ error: "Failed to fetch provider profile" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!providerProfile) {
            return new Response(
                JSON.stringify({ error: "Provider profile not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const origin = req.headers.get("origin") || "https://bookease9.lovable.app";

        switch (action) {
            case "get_account_status": {
                logStep("Getting account status", { providerId: providerProfile.id });

                if (!providerProfile.stripe_account_id) {
                    return new Response(
                        JSON.stringify({
                            has_account: false,
                            onboarding_complete: false,
                            charges_enabled: false,
                            payouts_enabled: false,
                        }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                try {
                    const account = await stripe.accounts.retrieve(providerProfile.stripe_account_id);

                    // Update provider profile with latest status
                    await supabaseAdmin
                        .from("provider_profiles")
                        .update({
                            stripe_charges_enabled: account.charges_enabled,
                            stripe_payouts_enabled: account.payouts_enabled,
                        })
                        .eq("id", providerProfile.id);

                    return new Response(
                        JSON.stringify({
                            has_account: true,
                            account_id: account.id,
                            onboarding_complete: account.details_submitted ?? false,
                            charges_enabled: account.charges_enabled ?? false,
                            payouts_enabled: account.payouts_enabled ?? false,
                            requirements: account.requirements ? {
                                currently_due: account.requirements.currently_due || [],
                                eventually_due: account.requirements.eventually_due || [],
                                past_due: account.requirements.past_due || [],
                            } : undefined,
                        }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                } catch (stripeError) {
                    logStep("Stripe account retrieve error", { error: (stripeError as Error).message });
                    return new Response(
                        JSON.stringify({
                            has_account: false,
                            onboarding_complete: false,
                            charges_enabled: false,
                            payouts_enabled: false,
                        }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            }

            case "create_account_link": {
                logStep("Creating account link", { providerId: providerProfile.id });

                let accountId = providerProfile.stripe_account_id;

                // Create new account if doesn't exist
                if (!accountId) {
                    logStep("Creating new Stripe Connect account");
                    const account = await stripe.accounts.create({
                        type: "express",
                        country: "IN", // India
                        email: userData.user.email,
                        capabilities: {
                            card_payments: { requested: true },
                            transfers: { requested: true },
                        },
                        business_type: "individual",
                        metadata: {
                            provider_id: providerProfile.id,
                            user_id: userId,
                        },
                    });

                    accountId = account.id;

                    // Save account ID to provider profile
                    await supabaseAdmin
                        .from("provider_profiles")
                        .update({ stripe_account_id: accountId })
                        .eq("id", providerProfile.id);

                    logStep("Created Stripe account", { accountId });
                }

                // Create account link for onboarding
                const accountLink = await stripe.accountLinks.create({
                    account: accountId,
                    refresh_url: `${origin}/dashboard/provider/settings?stripe=refresh`,
                    return_url: `${origin}/dashboard/provider/settings?stripe=success`,
                    type: "account_onboarding",
                });

                logStep("Created account link", { url: accountLink.url });

                return new Response(
                    JSON.stringify({ url: accountLink.url }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "create_login_link": {
                logStep("Creating login link", { providerId: providerProfile.id });

                if (!providerProfile.stripe_account_id) {
                    return new Response(
                        JSON.stringify({ error: "No Stripe account found. Please complete onboarding first." }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const loginLink = await stripe.accounts.createLoginLink(
                    providerProfile.stripe_account_id
                );

                logStep("Created login link", { url: loginLink.url });

                return new Response(
                    JSON.stringify({ url: loginLink.url }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            default:
                return new Response(
                    JSON.stringify({ error: `Unknown action: ${action}` }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }
    } catch (error) {
        logStep("Unexpected error", { error: (error as Error).message });
        return new Response(
            JSON.stringify({ error: (error as Error).message || "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
