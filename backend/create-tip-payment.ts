// Create Tip Payment Edge Function
// Process tips for providers

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TipRequest {
    appointment_id: string;
    amount: number;
    message?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[CREATE-TIP] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            throw new Error("Stripe key not configured");
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

        const body: TipRequest = await req.json();
        const { appointment_id, amount, message } = body;

        if (!appointment_id || !amount || amount <= 0) {
            return new Response(
                JSON.stringify({ error: "appointment_id and positive amount required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Processing tip", { appointmentId: appointment_id, amount, userId: user.id });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get appointment
        const { data: appointment, error: appointmentError } = await supabaseAdmin
            .from("appointments")
            .select("*, provider:provider_id (id, email, full_name)")
            .eq("id", appointment_id)
            .eq("user_id", user.id)
            .eq("status", "completed")
            .single();

        if (appointmentError || !appointment) {
            return new Response(
                JSON.stringify({ error: "Completed appointment not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if tip already exists
        const { data: existingTip } = await supabaseAdmin
            .from("tips")
            .select("id")
            .eq("appointment_id", appointment_id)
            .eq("user_id", user.id)
            .single();

        if (existingTip) {
            return new Response(
                JSON.stringify({ error: "Tip already submitted for this appointment" }),
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

        // Create Stripe checkout session for tip
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: `Tip for ${appointment.provider?.full_name || "Provider"}`,
                            description: message || "Thank you tip",
                        },
                        unit_amount: Math.round(amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${origin}/appointments?tip=success`,
            cancel_url: `${origin}/appointments?tip=cancelled`,
            metadata: {
                type: "tip",
                appointment_id,
                user_id: user.id,
                provider_id: appointment.provider_id,
                message: message || "",
            },
        });

        // Create pending tip record
        const { data: tip, error: tipError } = await supabaseAdmin
            .from("tips")
            .insert({
                appointment_id,
                user_id: user.id,
                provider_id: appointment.provider_id,
                amount,
                message,
                stripe_payment_intent_id: session.payment_intent as string,
                status: "pending",
            })
            .select()
            .single();

        if (tipError) throw tipError;

        logStep("Tip checkout created", { tipId: tip.id, sessionId: session.id });

        return new Response(
            JSON.stringify({ success: true, url: session.url, tip_id: tip.id }),
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
