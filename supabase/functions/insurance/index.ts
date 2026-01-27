// Insurance Add-ons Edge Function
// Manage booking insurance products and claims

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsuranceRequest {
    action: "get_products" | "calculate_premium" | "purchase" | "get_purchases" | "file_claim" | "get_claims";
    product_id?: string;
    appointment_id?: string;
    booking_value?: number;
    claim_data?: {
        claim_type: string;
        claim_reason: string;
        claim_amount: number;
        evidence_urls?: string[];
    };
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[INSURANCE] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

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

        const body: InsuranceRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "get_products": {
                const { data: products, error } = await supabaseAdmin
                    .from("insurance_products")
                    .select("*")
                    .eq("is_active", true)
                    .order("insurance_type");

                if (error) throw error;

                return new Response(
                    JSON.stringify({ products }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "calculate_premium": {
                const { product_id, booking_value } = body;

                if (!product_id || booking_value === undefined) {
                    return new Response(
                        JSON.stringify({ error: "product_id and booking_value required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: premium, error } = await supabaseAdmin.rpc("calculate_insurance_premium", {
                    p_product_id: product_id,
                    p_booking_value: booking_value,
                });

                if (error) throw error;

                if (premium === null) {
                    return new Response(
                        JSON.stringify({ error: "Booking value out of range for this product" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Get product details
                const { data: product } = await supabaseAdmin
                    .from("insurance_products")
                    .select("*")
                    .eq("id", product_id)
                    .single();

                return new Response(
                    JSON.stringify({
                        premium,
                        booking_value,
                        coverage_amount: product?.coverage_amount,
                        product,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "purchase": {
                const { product_id, appointment_id, booking_value } = body;

                if (!product_id || !appointment_id || booking_value === undefined) {
                    return new Response(
                        JSON.stringify({ error: "product_id, appointment_id, and booking_value required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Get product and calculate premium
                const { data: product } = await supabaseAdmin
                    .from("insurance_products")
                    .select("*")
                    .eq("id", product_id)
                    .single();

                if (!product) {
                    return new Response(
                        JSON.stringify({ error: "Product not found" }),
                        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: premium } = await supabaseAdmin.rpc("calculate_insurance_premium", {
                    p_product_id: product_id,
                    p_booking_value: booking_value,
                });

                // Get appointment details
                const { data: appointment } = await supabaseAdmin
                    .from("appointments")
                    .select("start_time")
                    .eq("id", appointment_id)
                    .single();

                if (!appointment) {
                    return new Response(
                        JSON.stringify({ error: "Appointment not found" }),
                        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Generate policy number
                const { data: policyNumber } = await supabaseAdmin.rpc("generate_policy_number");

                // Create Stripe payment if available
                let stripePaymentId: string | undefined;
                if (stripeKey && premium > 0) {
                    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

                    // Get or create customer
                    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
                    let customerId = customers.data[0]?.id;
                    if (!customerId) {
                        const customer = await stripe.customers.create({ email: user.email });
                        customerId = customer.id;
                    }

                    // Create payment intent
                    const paymentIntent = await stripe.paymentIntents.create({
                        amount: Math.round(premium * 100),
                        currency: "usd",
                        customer: customerId,
                        metadata: {
                            type: "insurance_purchase",
                            user_id: user.id,
                            appointment_id,
                            product_id,
                        },
                    });

                    stripePaymentId = paymentIntent.id;

                    return new Response(
                        JSON.stringify({
                            requires_payment: true,
                            client_secret: paymentIntent.client_secret,
                            premium,
                            policy_number: policyNumber,
                        }),
                        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Create insurance purchase (if no payment required or for demo)
                const validFrom = new Date();
                const validUntil = new Date(appointment.start_time);
                validUntil.setDate(validUntil.getDate() + 1); // Valid until day after appointment

                const { data: purchase, error: purchaseError } = await supabaseAdmin
                    .from("insurance_purchases")
                    .insert({
                        user_id: user.id,
                        appointment_id,
                        insurance_product_id: product_id,
                        coverage_amount: product.coverage_amount,
                        premium_paid: premium,
                        booking_value,
                        policy_number: policyNumber,
                        valid_from: validFrom.toISOString(),
                        valid_until: validUntil.toISOString(),
                        stripe_payment_id: stripePaymentId,
                    })
                    .select()
                    .single();

                if (purchaseError) throw purchaseError;

                logStep("Insurance purchased", { purchaseId: purchase.id, policyNumber });

                return new Response(
                    JSON.stringify({ success: true, purchase }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_purchases": {
                const { data: purchases, error } = await supabaseAdmin
                    .from("insurance_purchases")
                    .select(`
            *,
            product:insurance_product_id (*),
            appointment:appointment_id (*)
          `)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ purchases }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "file_claim": {
                const { product_id: insurance_purchase_id, claim_data } = body;

                if (!insurance_purchase_id || !claim_data) {
                    return new Response(
                        JSON.stringify({ error: "insurance_purchase_id and claim_data required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Check eligibility
                const { data: eligibility, error: eligError } = await supabaseAdmin.rpc("check_claim_eligibility", {
                    p_insurance_purchase_id: insurance_purchase_id,
                    p_claim_type: claim_data.claim_type,
                });

                if (eligError) throw eligError;

                if (!eligibility?.eligible) {
                    return new Response(
                        JSON.stringify({ error: eligibility?.reason || "Not eligible for claim" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Create claim
                const { data: claim, error: claimError } = await supabaseAdmin
                    .from("insurance_claims")
                    .insert({
                        insurance_purchase_id,
                        user_id: user.id,
                        claim_type: claim_data.claim_type,
                        claim_reason: claim_data.claim_reason,
                        claim_amount: Math.min(claim_data.claim_amount, eligibility.coverage_amount),
                        evidence_urls: claim_data.evidence_urls || [],
                    })
                    .select()
                    .single();

                if (claimError) throw claimError;

                // Update purchase status
                await supabaseAdmin
                    .from("insurance_purchases")
                    .update({ status: "claimed" })
                    .eq("id", insurance_purchase_id);

                logStep("Claim filed", { claimId: claim.id });

                return new Response(
                    JSON.stringify({ success: true, claim }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_claims": {
                const { data: claims, error } = await supabaseAdmin
                    .from("insurance_claims")
                    .select(`
            *,
            insurance_purchase:insurance_purchase_id (
              *,
              product:insurance_product_id (*)
            )
          `)
                    .eq("user_id", user.id)
                    .order("submitted_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ claims }),
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
