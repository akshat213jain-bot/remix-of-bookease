// Cancel Appointment with Fee Edge Function
// Handle appointment cancellation with fee calculation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelRequest {
    appointment_id: string;
    reason?: string;
    reason_category?: string;
    waive_fee?: boolean;
    waiver_reason?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[CANCEL-WITH-FEE] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
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

        const body: CancelRequest = await req.json();
        const { appointment_id, reason, reason_category, waive_fee, waiver_reason } = body;

        if (!appointment_id) {
            return new Response(
                JSON.stringify({ error: "appointment_id required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get appointment
        const { data: appointment, error: appointmentError } = await supabaseAdmin
            .from("appointments")
            .select("*")
            .eq("id", appointment_id)
            .single();

        if (appointmentError || !appointment) {
            return new Response(
                JSON.stringify({ error: "Appointment not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify user is authorized to cancel
        const isUser = appointment.user_id === user.id;
        const isProvider = appointment.provider_id === user.id;

        if (!isUser && !isProvider) {
            return new Response(
                JSON.stringify({ error: "Not authorized to cancel this appointment" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (appointment.status === "cancelled") {
            return new Response(
                JSON.stringify({ error: "Appointment is already cancelled" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Cancelling appointment", { appointmentId: appointment_id, cancelledBy: user.id });

        // Calculate cancellation fee
        const { data: feeData } = await supabaseAdmin.rpc("calculate_cancellation_fee", {
            p_appointment_id: appointment_id,
        });

        const feeResult = feeData?.[0] || { fee_amount: 0, refund_amount: 0, hours_before: 0 };
        const finalFee = waive_fee ? 0 : feeResult.fee_amount;
        const refundAmount = waive_fee ? feeResult.fee_amount + feeResult.refund_amount : feeResult.refund_amount;

        // Process refund if needed
        let stripeRefundId = null;
        if (refundAmount > 0 && stripeKey) {
            // Get payment records
            const { data: payments } = await supabaseAdmin
                .from("appointment_payments")
                .select("stripe_payment_intent_id")
                .eq("appointment_id", appointment_id)
                .eq("status", "completed")
                .neq("payment_type", "refund");

            if (payments && payments.length > 0) {
                const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

                for (const payment of payments) {
                    if (payment.stripe_payment_intent_id) {
                        try {
                            const refund = await stripe.refunds.create({
                                payment_intent: payment.stripe_payment_intent_id,
                                amount: Math.round(refundAmount * 100),
                                reason: "requested_by_customer",
                            });
                            stripeRefundId = refund.id;
                            break; // Only one refund needed
                        } catch (refundError) {
                            logStep("Refund error", { error: refundError });
                        }
                    }
                }
            }
        }

        // Update appointment status
        await supabaseAdmin
            .from("appointments")
            .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
            })
            .eq("id", appointment_id);

        // Create cancellation record
        const { data: cancellation } = await supabaseAdmin
            .from("cancellations")
            .insert({
                appointment_id,
                cancelled_by: user.id,
                canceller_type: isProvider ? "provider" : "user",
                reason,
                reason_category,
                hours_before_appointment: feeResult.hours_before,
                fee_applied: finalFee,
                fee_waived: waive_fee || false,
                fee_waiver_reason: waiver_reason,
                refund_amount: refundAmount,
                refund_status: stripeRefundId ? "completed" : refundAmount > 0 ? "pending" : "not_applicable",
                stripe_refund_id: stripeRefundId,
            })
            .select()
            .single();

        // Create notifications
        const notifyUserId = isProvider ? appointment.user_id : appointment.provider_id;
        await supabaseAdmin.from("notifications").insert({
            user_id: notifyUserId,
            type: "appointment_cancelled",
            title: "Appointment Cancelled",
            message: `An appointment has been cancelled${reason ? `: ${reason}` : "."}${refundAmount > 0 ? ` Refund of ₹${refundAmount} will be processed.` : ""}`,
            data: { appointment_id, cancellation_id: cancellation?.id },
        });

        logStep("Cancellation complete", {
            feeApplied: finalFee,
            refundAmount,
            refundId: stripeRefundId,
        });

        return new Response(
            JSON.stringify({
                success: true,
                cancellation: cancellation,
                fee_applied: finalFee,
                refund_amount: refundAmount,
                refund_status: stripeRefundId ? "completed" : refundAmount > 0 ? "pending" : "not_applicable",
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
