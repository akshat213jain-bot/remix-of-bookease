import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[SEND-PAYMENT-REMINDER] ${step}${detailsStr}`);
};

interface ReminderRequest {
    appointment_id: string;
    custom_message?: string;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const brevoApiKey = Deno.env.get("BREVO_API_KEY");

        if (!brevoApiKey) {
            logStep("ERROR: BREVO_API_KEY not configured");
            return new Response(JSON.stringify({ error: "Email service not configured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        // Verify provider authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Authorization required" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError || !userData.user) {
            logStep("Auth error", { error: userError?.message });
            return new Response(JSON.stringify({ error: "User not authenticated" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get provider profile
        const { data: providerProfile, error: providerError } = await supabase
            .from("provider_profiles")
            .select("id, user_id, full_name, consultation_fee, video_consultation_fee")
            .eq("user_id", userData.user.id)
            .single();

        if (providerError || !providerProfile) {
            logStep("Not a provider", { userId: userData.user.id });
            return new Response(JSON.stringify({ error: "Provider profile not found" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body: ReminderRequest = await req.json();
        const { appointment_id, custom_message } = body;

        if (!appointment_id) {
            return new Response(JSON.stringify({ error: "appointment_id is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get appointment details including video consultation flag
        const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .select("id, appointment_date, start_time, end_time, user_id, payment_amount, payment_status, status, is_video_consultation")
            .eq("id", appointment_id)
            .eq("provider_id", providerProfile.id)
            .single();

        if (appointmentError || !appointment) {
            logStep("Appointment not found", { appointmentId: appointment_id });
            return new Response(JSON.stringify({ error: "Appointment not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get consumer profile
        const { data: consumerProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", appointment.user_id)
            .single();

        if (!consumerProfile?.email) {
            logStep("Consumer email not found", { userId: appointment.user_id });
            return new Response(JSON.stringify({ error: "Consumer email not found" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Calculate correct amount based on appointment type
        const baseFee = appointment.is_video_consultation
            ? (providerProfile.video_consultation_fee || providerProfile.consultation_fee || 0)
            : (providerProfile.consultation_fee || 0);
        const amount = appointment.payment_amount || baseFee;
        const formattedAmount = (amount / 100).toFixed(2);
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        // Format time
        const formatTime = (time: string) => {
            const [hours, minutes] = time.split(":");
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? "PM" : "AM";
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        };

        const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@bookease.com";
        const senderName = Deno.env.get("BREVO_SENDER_NAME") || "BookEase";

        const defaultMessage = `This is a friendly reminder that your appointment with ${providerProfile.full_name} is scheduled for ${appointmentDate} at ${formatTime(appointment.start_time)}. Please complete your payment of ₹${formattedAmount} to confirm your booking.`;

        const emailHtml = generateReminderEmail(
            consumerProfile.full_name || "there",
            providerProfile.full_name || "your provider",
            appointmentDate,
            formatTime(appointment.start_time),
            formattedAmount,
            custom_message || defaultMessage
        );

        logStep("Sending reminder email", { to: consumerProfile.email });

        const emailPayload = {
            sender: { name: senderName, email: senderEmail },
            replyTo: { name: senderName, email: senderEmail },
            to: [{ email: consumerProfile.email, name: consumerProfile.full_name || consumerProfile.email }],
            subject: `💳 Payment Reminder - Appointment with ${providerProfile.full_name}`,
            htmlContent: emailHtml,
            textContent: custom_message || defaultMessage,
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

        const responseText = await emailResponse.text();
        let messageId: string | null = null;
        try {
            const parsed = JSON.parse(responseText);
            messageId = typeof parsed?.messageId === "string" ? parsed.messageId : null;
        } catch { /* ignore */ }

        if (!emailResponse.ok) {
            logStep("Email send failed", { status: emailResponse.status, response: responseText });
            return new Response(JSON.stringify({ error: "Failed to send reminder email" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        logStep("Reminder sent successfully", { messageId });

        // Log to outgoing_emails table
        if (messageId) {
            await supabase.from("outgoing_emails").insert({
                message_id: messageId,
                provider: "brevo",
                to_emails: [consumerProfile.email],
                subject: `Payment Reminder - Appointment with ${providerProfile.full_name}`,
                email_type: "payment_reminder",
                status: "accepted",
                sender_email: senderEmail,
                provider_response: responseText,
            });
        }

        // Also create an in-app notification
        await supabase.from("notifications").insert({
            user_id: appointment.user_id,
            title: "Payment Reminder",
            message: `Please complete your payment of ₹${formattedAmount} for your appointment with ${providerProfile.full_name} on ${appointmentDate}.`,
            type: "payment_reminder",
            related_appointment_id: appointment_id,
        });

        return new Response(JSON.stringify({
            success: true,
            messageId,
            email_sent_to: consumerProfile.email,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        logStep("Error", { error: String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

function generateReminderEmail(
    consumerName: string,
    providerName: string,
    appointmentDate: string,
    startTime: string,
    amount: string,
    message: string
): string {
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
            <!-- Header -->
            <div style="text-align: center; padding-bottom: 30px;">
              <div style="display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                💳 Payment Reminder
              </div>
            </div>
            
            <!-- Content -->
            <p style="font-size: 16px; color: #374151;">Hi ${consumerName},</p>
            
            <p style="font-size: 16px; color: #4B5563; line-height: 1.6;">${message}</p>
            
            <!-- Appointment Details Card -->
            <div style="background-color: #FEF3C7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h3 style="margin: 0 0 15px 0; color: #92400E;">Appointment Details</h3>
              <p style="margin: 5px 0; color: #78350F;"><strong>Provider:</strong> ${providerName}</p>
              <p style="margin: 5px 0; color: #78350F;"><strong>Date:</strong> ${appointmentDate}</p>
              <p style="margin: 5px 0; color: #78350F;"><strong>Time:</strong> ${startTime}</p>
              <p style="margin: 15px 0 0 0; font-size: 24px; font-weight: bold; color: #D97706;">₹${amount}</p>
            </div>
            
            <p style="font-size: 14px; color: #6B7280; margin-top: 20px;">
              Please log in to your BookEase account to complete the payment and secure your appointment.
            </p>
            
            <!-- Footer -->
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
