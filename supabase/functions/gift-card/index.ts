// Gift Card Edge Function
// Purchase and manage gift cards

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GiftCardRequest {
    action: "purchase" | "redeem" | "check_balance" | "list";
    amount?: number;
    recipient_email?: string;
    recipient_name?: string;
    sender_name?: string;
    personal_message?: string;
    code?: string;
    redemption_amount?: number;
    appointment_id?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[GIFT-CARD] ${step}${detailsStr}`);
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

        const body: GiftCardRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "purchase": {
                if (!stripeKey) {
                    throw new Error("Stripe not configured");
                }

                const { amount, recipient_email, recipient_name, sender_name, personal_message } = body;

                if (!amount || amount < 100) {
                    return new Response(
                        JSON.stringify({ error: "Minimum gift card amount is ₹100" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
                const origin = req.headers.get("origin") || "https://bookease9.lovable.app";

                // Create checkout session
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ["card"],
                    line_items: [
                        {
                            price_data: {
                                currency: "inr",
                                product_data: {
                                    name: "BookEase Gift Card",
                                    description: `₹${amount} Gift Card${recipient_name ? ` for ${recipient_name}` : ""}`,
                                },
                                unit_amount: Math.round(amount * 100),
                            },
                            quantity: 1,
                        },
                    ],
                    mode: "payment",
                    success_url: `${origin}/rewards?gift_card=success`,
                    cancel_url: `${origin}/rewards?gift_card=cancelled`,
                    metadata: {
                        type: "gift_card",
                        purchaser_id: user.id,
                        amount: amount.toString(),
                        recipient_email: recipient_email || "",
                        recipient_name: recipient_name || "",
                        sender_name: sender_name || "",
                        personal_message: personal_message || "",
                    },
                });

                logStep("Gift card checkout created", { sessionId: session.id, amount });

                return new Response(
                    JSON.stringify({ success: true, url: session.url }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "redeem": {
                const { code, redemption_amount, appointment_id } = body;

                if (!code) {
                    return new Response(
                        JSON.stringify({ error: "Gift card code required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data, error: redeemError } = await supabaseAdmin.rpc("redeem_gift_card", {
                    p_code: code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    p_user_id: user.id,
                    p_amount: redemption_amount || 0,
                    p_appointment_id: appointment_id || null,
                });

                if (redeemError) throw redeemError;

                const result = data?.[0];
                if (!result?.success) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: result?.error_message || "Redemption failed",
                            balance: result?.remaining_balance
                        }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                logStep("Gift card redeemed", { code, amount: redemption_amount, newBalance: result.remaining_balance });

                return new Response(
                    JSON.stringify({
                        success: true,
                        remaining_balance: result.remaining_balance
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "check_balance": {
                const { code } = body;

                if (!code) {
                    return new Response(
                        JSON.stringify({ error: "Gift card code required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: card, error: cardError } = await supabaseAdmin
                    .from("gift_cards")
                    .select("balance, amount, expires_at, is_active")
                    .eq("code", code.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    .single();

                if (cardError || !card) {
                    return new Response(
                        JSON.stringify({ error: "Gift card not found" }),
                        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                return new Response(
                    JSON.stringify({
                        balance: card.balance,
                        original_amount: card.amount,
                        expires_at: card.expires_at,
                        is_active: card.is_active,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "list": {
                const { data: cards, error: listError } = await supabaseAdmin
                    .from("gift_cards")
                    .select("*")
                    .or(`purchaser_id.eq.${user.id},recipient_id.eq.${user.id}`)
                    .order("created_at", { ascending: false });

                if (listError) throw listError;

                return new Response(
                    JSON.stringify({ cards }),
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
