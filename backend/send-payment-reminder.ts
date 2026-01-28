/**
 * Send Payment Reminder Edge Function
 * 
 * Allows providers to send payment reminder emails to consumers
 * for unpaid appointments via Brevo API.
 * 
 * Deployed location: supabase/functions/send-payment-reminder/index.ts
 */

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
            .select("id, user_id, full_name, consultation_fee")
            .eq("user_id", userData.user.id)
            .single();

        if (providerError || !providerProfile) {
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

        // Get appointment and consumer details, send reminder email via Brevo
        // ... (full implementation in supabase/functions/send-payment-reminder/index.ts)

        return new Response(JSON.stringify({ success: true }), {
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
