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
          type: session.metadata?.type,
          paymentStatus: session.payment_status
        });

        // Handle subscription purchases
        if (session.metadata?.type === "subscription" && session.metadata?.plan_id) {
          logStep("Processing subscription purchase", {
            planId: session.metadata.plan_id,
            userId: session.metadata.user_id
          });

          const appointmentsIncluded = parseInt(session.metadata.appointments_included || "0", 10);
          const durationDays = parseInt(session.metadata.duration_days || "30", 10);

          const startsAt = new Date();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);

          const { error: subscriptionError } = await supabase
            .from("user_subscriptions")
            .insert({
              user_id: session.metadata.user_id,
              plan_id: session.metadata.plan_id,
              status: "active",
              starts_at: startsAt.toISOString(),
              expires_at: expiresAt.toISOString(),
              appointments_remaining: appointmentsIncluded,
              stripe_subscription_id: session.id,
            });

          if (subscriptionError) {
            logStep("Error creating subscription", { error: subscriptionError.message });
          } else {
            logStep("Subscription created successfully");

            // Notify user
            await supabase.from("notifications").insert({
              user_id: session.metadata.user_id,
              title: "Subscription Activated!",
              message: `Your subscription is now active with ${appointmentsIncluded} appointments for ${durationDays} days.`,
              type: "payment_success",
            });
          }
        }
        // Handle appointment payments
        else if (session.metadata?.appointment_id) {
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
                // Send email via Brevo (consistent with other email notifications)
                const brevoApiKey = Deno.env.get("BREVO_API_KEY");
                if (brevoApiKey) {
                  try {
                    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@bookease.com";
                    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "BookEase";

                    const emailPayload = {
                      sender: { name: senderName, email: senderEmail },
                      replyTo: { name: senderName, email: senderEmail },
                      to: [{ email: profile.email, name: profile.full_name || profile.email }],
                      subject: "💳 Payment Successful - Your Appointment is Confirmed",
                      htmlContent: generatePaymentSuccessEmail(profile.full_name, session.amount_total || 0),
                      headers: { "X-Entity-Ref-ID": crypto.randomUUID() },
                    };

                    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
                      method: "POST",
                      headers: {
                        "api-key": brevoApiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                      },
                      body: JSON.stringify(emailPayload),
                    });

                    if (emailResponse.ok) {
                      const responseData = await emailResponse.json();
                      logStep("Payment success email sent via Brevo", { email: profile.email, messageId: responseData?.messageId });

                      // Log to outgoing_emails table
                      if (responseData?.messageId) {
                        await supabase.from("outgoing_emails").insert({
                          message_id: responseData.messageId,
                          provider: "brevo",
                          to_emails: [profile.email],
                          subject: "Payment Successful - Your Appointment is Confirmed",
                          email_type: "payment_success",
                          status: "accepted",
                          sender_email: senderEmail,
                        });
                      }
                    } else {
                      logStep("Failed to send email via Brevo", { status: emailResponse.status });
                    }
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

function generateRefundEmail(name: string, amount: number): string {
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
              <div style="display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                ↩️ Refund Processed
              </div>
            </div>
            <p style="font-size: 16px; color: #374151;">Hi ${name || "there"},</p>
            <h1 style="font-size: 24px; font-weight: bold; color: #111827;">Your refund of $${formattedAmount} has been processed</h1>
            <p style="font-size: 16px; color: #4B5563; line-height: 1.6;">
              The refund should appear in your account within 5-10 business days, depending on your bank or card issuer.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #FEF3C7; border-radius: 8px; padding: 20px; display: inline-block;">
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #D97706;">$${formattedAmount}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #92400E;">Refunded</p>
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

function generatePaymentFailedEmail(name: string): string {
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
              <div style="display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                ⚠️ Payment Failed
              </div>
            </div>
            <p style="font-size: 16px; color: #374151;">Hi ${name || "there"},</p>
            <h1 style="font-size: 24px; font-weight: bold; color: #111827;">Your payment could not be processed</h1>
            <p style="font-size: 16px; color: #4B5563; line-height: 1.6;">
              Unfortunately, we were unable to process your payment. This could be due to insufficient funds, an expired card, or other issues with your payment method.
            </p>
            <p style="font-size: 16px; color: #4B5563; line-height: 1.6;">
              Please try again with a different payment method or contact your bank for assistance.
            </p>
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
