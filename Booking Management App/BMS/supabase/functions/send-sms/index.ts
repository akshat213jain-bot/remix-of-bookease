// Send SMS Edge Function
// Sends SMS notifications via Twilio

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSMSRequest {
    phone_number: string;
    message: string;
    message_type?: "reminder" | "verification" | "notification" | "marketing";
    user_id?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[SEND-SMS] ${step}${detailsStr}`);
}

async function sendViaTwilio(
    phoneNumber: string,
    message: string,
    accountSid: string,
    authToken: string,
    fromNumber: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: message,
    });

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (response.ok) {
        return { success: true, messageId: data.sid };
    } else {
        return { success: false, error: data.message || "Failed to send SMS" };
    }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            logStep("Twilio not configured");
            return new Response(
                JSON.stringify({ error: "SMS service not configured" }),
                { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const body: SendSMSRequest = await req.json();
        const { phone_number, message, message_type = "notification", user_id } = body;

        if (!phone_number || !message) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: phone_number, message" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate phone number format (basic check)
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone_number)) {
            return new Response(
                JSON.stringify({ error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check rate limit
        const { data: rateCheck } = await supabaseAdmin.rpc("check_sms_rate_limit", {
            p_phone_number: phone_number,
        });

        if (!rateCheck) {
            logStep("Rate limit exceeded", { phone_number });
            return new Response(
                JSON.stringify({ error: "SMS rate limit exceeded. Please try again later." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Sending SMS", { phone_number, message_type });

        // Create log entry
        const { data: logEntry, error: logError } = await supabaseAdmin
            .from("sms_logs")
            .insert({
                user_id: user_id || null,
                phone_number,
                message,
                message_type,
                status: "pending",
                provider: "twilio",
            })
            .select()
            .single();

        if (logError) {
            logStep("Error creating log entry", { error: logError.message });
        }

        // Send SMS via Twilio
        const result = await sendViaTwilio(
            phone_number,
            message,
            twilioAccountSid,
            twilioAuthToken,
            twilioPhoneNumber
        );

        // Update log entry
        if (logEntry) {
            await supabaseAdmin
                .from("sms_logs")
                .update({
                    status: result.success ? "sent" : "failed",
                    external_id: result.messageId || null,
                    error_message: result.error || null,
                    sent_at: result.success ? new Date().toISOString() : null,
                })
                .eq("id", logEntry.id);
        }

        if (result.success) {
            logStep("SMS sent successfully", { messageId: result.messageId });
            return new Response(
                JSON.stringify({ success: true, message_id: result.messageId }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        } else {
            logStep("Failed to send SMS", { error: result.error });
            return new Response(
                JSON.stringify({ error: result.error }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
