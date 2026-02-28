/**
 * Stripe Webhook Edge Function
 * 
 * Handles Stripe webhook events:
 * - checkout.session.completed - Payment successful
 * - checkout.session.expired - Payment session expired
 * - payment_intent.payment_failed - Payment failed
 * - charge.refunded - Refund processed
 * 
 * Deployed location: supabase/functions/stripe-webhook/index.ts
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!stripeSecretKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified", { eventType: event.type });
      } catch (err) {
        logStep("Webhook signature verification failed", { error: String(err) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For development/testing without webhook secret
      event = JSON.parse(body);
      logStep("Processing unverified webhook", { eventType: event.type });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          appointmentId: session.metadata?.appointment_id,
          paymentStatus: session.payment_status 
        });

        if (session.metadata?.appointment_id) {
          const { error: updateError } = await supabase
            .from("appointments")
            .update({
              payment_status: session.payment_status === "paid" ? "paid" : "pending",
              payment_amount: session.amount_total,
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              payment_date: new Date().toISOString(),
              status: "approved", // Auto-approve on successful payment
            })
            .eq("id", session.metadata.appointment_id);

          if (updateError) {
            logStep("Error updating appointment", { error: updateError.message });
          } else {
            logStep("Appointment updated successfully", { appointmentId: session.metadata.appointment_id });
            
            // Create notification for user
            if (session.metadata.user_id) {
              await supabase.from("notifications").insert({
                user_id: session.metadata.user_id,
                title: "Payment Successful",
                message: "Your appointment payment has been confirmed. Your booking is now approved.",
                type: "payment_success",
                related_appointment_id: session.metadata.appointment_id,
              });

              // Get user email for sending email notification
              const { data: profile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("user_id", session.metadata.user_id)
                .single();

              if (profile?.email) {
                // Send email via Resend
                const resendApiKey = Deno.env.get("RESEND_API_KEY");
                if (resendApiKey) {
                  try {
                    await fetch("https://api.resend.com/emails", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${resendApiKey}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        from: "BookEase <notifications@resend.dev>",
                        to: [profile.email],
                        subject: "💳 Payment Successful - Your Appointment is Confirmed",
                        html: generatePaymentSuccessEmail(profile.full_name, session.amount_total || 0),
                      }),
                    });
                    logStep("Payment success email sent", { email: profile.email });
                  } catch (emailError) {
                    logStep("Failed to send email", { error: String(emailError) });
                  }
                }
              }
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session expired", { sessionId: session.id });

        if (session.metadata?.appointment_id) {
          await supabase
            .from("appointments")
            .update({ payment_status: "expired" })
            .eq("id", session.metadata.appointment_id);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment failed", { 
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message 
        });

        // Find appointment by payment intent and update status
        const { data: appointments } = await supabase
          .from("appointments")
          .select("id, user_id")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .limit(1);

        if (appointments && appointments.length > 0) {
          const appointment = appointments[0];
          await supabase
            .from("appointments")
            .update({ payment_status: "failed" })
            .eq("id", appointment.id);

          // Notify user of failed payment
          await supabase.from("notifications").insert({
            user_id: appointment.user_id,
            title: "Payment Failed",
            message: `Your payment could not be processed. Please try again or use a different payment method.`,
            type: "error",
            related_appointment_id: appointment.id,
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Charge refunded", { chargeId: charge.id, paymentIntentId: charge.payment_intent });

        if (charge.payment_intent) {
          const { data: appointments } = await supabase
            .from("appointments")
            .select("id, user_id")
            .eq("stripe_payment_intent_id", charge.payment_intent)
            .limit(1);

          if (appointments && appointments.length > 0) {
            const appointment = appointments[0];
            await supabase
              .from("appointments")
              .update({ payment_status: "refunded" })
              .eq("id", appointment.id);

            await supabase.from("notifications").insert({
              user_id: appointment.user_id,
              title: "Refund Processed",
              message: "Your payment has been refunded successfully.",
              type: "info",
              related_appointment_id: appointment.id,
            });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("Webhook error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Email template helpers
function generatePaymentSuccessEmail(name: string, amount: number): string {
  const formattedAmount = (amount / 100).toFixed(2);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
          <td style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; padding-bottom: 30px;">
              <div style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                ✅ Payment Successful
              </div>
            </div>
            <p style="font-size: 16px; color: #374151;">Hi ${name || "there"},</p>
            <h1 style="font-size: 24px; font-weight: bold; color: #111827;">Your payment of $${formattedAmount} has been confirmed!</h1>
            <p style="font-size: 16px; color: #4B5563; line-height: 1.6;">
              Your appointment has been automatically approved. You can view your booking details and join your appointment from your dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; display: inline-block;">
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #10B981;">$${formattedAmount}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6B7280;">Amount Paid</p>
              </div>
            </div>
            <p style="text-align: center; font-size: 14px; color: #9CA3AF; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 20px;">
              This is an automated message from BookEase.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
