/**
 * Create Subscription Checkout Edge Function
 * 
 * Creates Stripe checkout sessions for subscription plan purchases.
 * 
 * Deployed location: supabase/functions/create-subscription-checkout/index.ts
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
    console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

interface CheckoutRequest {
    plan_id: string;
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

        const user = userData.user;
        logStep("Authenticated user", { userId: user.id, email: user.email });

        // Parse request body
        const body: CheckoutRequest = await req.json();
        const { plan_id } = body;

        if (!plan_id) {
            return new Response(
                JSON.stringify({ error: "plan_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get plan details with admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: plan, error: planError } = await supabaseAdmin
            .from("subscription_plans")
            .select("*")
            .eq("id", plan_id)
            .eq("is_active", true)
            .maybeSingle();

        if (planError || !plan) {
            logStep("Plan fetch error", { error: planError?.message, planId: plan_id });
            return new Response(
                JSON.stringify({ error: "Subscription plan not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Found plan", { planName: plan.name, price: plan.price });

        // Check if user already has an active subscription
        const { data: existingSubscription } = await supabaseAdmin
            .from("user_subscriptions")
            .select("id, expires_at")
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle();

        if (existingSubscription && new Date(existingSubscription.expires_at) > new Date()) {
            return new Response(
                JSON.stringify({ error: "You already have an active subscription" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Stripe
        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2025-08-27.basil",
        });

        // Check if customer exists in Stripe
        const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
        let customerId: string | undefined;
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        }

        const origin = req.headers.get("origin") || "https://frpxrbptxkgofompesvd.lovableproject.com";

        // Create checkout session for one-time subscription payment
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            customer_email: customerId ? undefined : user.email!,
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: `${plan.name} Subscription`,
                            description: plan.description || `${plan.appointments_included} appointments for ${plan.duration_days} days`,
                        },
                        unit_amount: Math.round(plan.price * 100), // Convert to paise
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${origin}/rewards?subscription=success&plan_id=${plan_id}`,
            cancel_url: `${origin}/rewards?subscription=cancelled`,
            metadata: {
                type: "subscription",
                plan_id: plan_id,
                user_id: user.id,
                appointments_included: plan.appointments_included.toString(),
                duration_days: plan.duration_days.toString(),
            },
        });

        logStep("Checkout session created", { sessionId: session.id });

        return new Response(
            JSON.stringify({ url: session.url, session_id: session.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        logStep("Unexpected error", { error: (error as Error).message });
        return new Response(
            JSON.stringify({ error: (error as Error).message || "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
