// Process Deposit Payment Edge Function
// Handle deposit and partial payments for bookings

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DepositRequest {
    appointment_id: string;
    amount?: number; // If not provided, will calculate based on settings
    payment_type: "deposit" | "partial" | "final";
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[PROCESS-DEPOSIT] ${step}${detailsStr}`);
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

        const body: DepositRequest = await req.json();
        const { appointment_id, amount, payment_type } = body;

        if (!appointment_id) {
            return new Response(
                JSON.stringify({ error: "appointment_id required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Processing deposit", { appointmentId: appointment_id, paymentType: payment_type });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get appointment with payment summary
        const { data: appointment, error: appointmentError } = await supabaseAdmin
            .from("appointments")
            .select(`
        *,
        services (name, price),
        provider:provider_id (full_name, email)
      `)
            .eq("id", appointment_id)
            .eq("user_id", user.id)
            .single();

        if (appointmentError || !appointment) {
            return new Response(
                JSON.stringify({ error: "Appointment not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Calculate payment amount
        let paymentAmount = amount;

        if (!paymentAmount) {
            if (payment_type === "deposit") {
                // Get deposit settings
                const { data: depositSettings } = await supabaseAdmin.rpc("calculate_deposit", {
                    p_provider_id: appointment.provider_id,
                    p_service_id: appointment.service_id,
                    p_total_amount: appointment.total_price || appointment.services?.price,
                });
                paymentAmount = depositSettings || 0;
            } else if (payment_type === "final") {
                // Get remaining balance
                const { data: summary } = await supabaseAdmin.rpc("get_payment_summary", {
                    p_appointment_id: appointment_id,
                });
                paymentAmount = summary?.[0]?.remaining_balance || 0;
            }
        }

        if (!paymentAmount || paymentAmount <= 0) {
            return new Response(
                JSON.stringify({ error: "Invalid payment amount" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

        // Get or create Stripe customer
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
                            name: `${payment_type === "deposit" ? "Deposit for" : payment_type === "final" ? "Final Payment for" : "Payment for"} ${appointment.services?.name || "Service"}`,
                            description: `With ${appointment.provider?.full_name || "Provider"}`,
                        },
                        unit_amount: Math.round(paymentAmount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${origin}/appointments/${appointment_id}?payment=success`,
            cancel_url: `${origin}/appointments/${appointment_id}?payment=cancelled`,
            metadata: {
                type: "appointment_payment",
                appointment_id,
                user_id: user.id,
                provider_id: appointment.provider_id,
                payment_type,
                amount: paymentAmount.toString(),
            },
        });

        // Create pending payment record
        await supabaseAdmin.from("appointment_payments").insert({
            appointment_id,
            user_id: user.id,
            amount: paymentAmount,
            payment_type,
            stripe_payment_intent_id: session.payment_intent as string,
            status: "pending",
        });

        logStep("Deposit checkout created", { sessionId: session.id, amount: paymentAmount });

        return new Response(
            JSON.stringify({ success: true, url: session.url, amount: paymentAmount }),
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
