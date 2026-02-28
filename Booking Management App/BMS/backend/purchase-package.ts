// Purchase Package Edge Function
// Buy service packages

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchasePackageRequest {
    package_id: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[PURCHASE-PACKAGE] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            throw new Error("Stripe not configured");
        }

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

        const body: PurchasePackageRequest = await req.json();
        const { package_id } = body;

        if (!package_id) {
            return new Response(
                JSON.stringify({ error: "package_id required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Purchasing package", { packageId: package_id, userId: user.id });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get package details
        const { data: pkg, error: packageError } = await supabaseAdmin
            .from("service_packages")
            .select("*, provider:provider_id (full_name)")
            .eq("id", package_id)
            .eq("is_active", true)
            .single();

        if (packageError || !pkg) {
            return new Response(
                JSON.stringify({ error: "Package not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check max purchases
        if (pkg.max_purchases && pkg.purchases_count >= pkg.max_purchases) {
            return new Response(
                JSON.stringify({ error: "Package is sold out" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

        // Get or create customer
        const { data: customers } = await stripe.customers.list({ email: user.email, limit: 1 });
        let customerId = customers.data[0]?.id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;
        }

        const origin = req.headers.get("origin") || "https://bookease9.lovable.app";

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: pkg.name,
                            description: `Service package from ${pkg.provider?.full_name || "Provider"} - Save ${pkg.savings_percentage}%!`,
                        },
                        unit_amount: Math.round(pkg.discounted_price * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${origin}/dashboard?package=success`,
            cancel_url: `${origin}/providers?package=cancelled`,
            metadata: {
                type: "service_package",
                package_id,
                user_id: user.id,
                provider_id: pkg.provider_id,
                services: JSON.stringify(pkg.services),
                valid_days: pkg.valid_days.toString(),
            },
        });

        logStep("Package checkout created", { sessionId: session.id, packageId: package_id });

        return new Response(
            JSON.stringify({ success: true, url: session.url }),
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
