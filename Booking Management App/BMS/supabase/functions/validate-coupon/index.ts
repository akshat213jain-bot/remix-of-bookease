// Validate Coupon Edge Function
// Validates a coupon code and returns discount information

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateCouponRequest {
    code: string;
    amount: number;
    service_id?: string;
}

interface CouponValidationResult {
    valid: boolean;
    coupon_id?: string;
    discount_type?: string;
    discount_value?: number;
    discount_amount?: number;
    error_message?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[VALIDATE-COUPON] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Get user from auth header
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

        logStep("User authenticated", { userId: user.id });

        const body: ValidateCouponRequest = await req.json();
        const { code, amount, service_id } = body;

        if (!code || typeof amount !== "number") {
            return new Response(
                JSON.stringify({ error: "Missing required fields: code, amount" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Validating coupon", { code, amount, service_id });

        // Use admin client to call the validation function
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const { data, error } = await supabaseAdmin.rpc("validate_coupon", {
            p_code: code.toUpperCase(),
            p_user_id: user.id,
            p_amount: amount,
            p_service_id: service_id || null,
        });

        if (error) {
            logStep("Validation error", { error: error.message });
            throw error;
        }

        const result = data?.[0] as CouponValidationResult;

        if (!result) {
            return new Response(
                JSON.stringify({ valid: false, error_message: "Invalid coupon code" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Validation result", result as unknown as Record<string, unknown>);

        return new Response(
            JSON.stringify({
                valid: result.valid,
                coupon_id: result.coupon_id,
                discount_type: result.discount_type,
                discount_value: result.discount_value,
                discount_amount: result.discount_amount,
                error_message: result.error_message,
                final_amount: result.valid ? amount - (result.discount_amount || 0) : amount,
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
