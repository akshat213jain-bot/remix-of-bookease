// HIPAA Compliance Edge Function
// Protected Health Information access logging and encryption

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HIPAARequest {
    action: "log_access" | "check_consent" | "grant_consent" | "revoke_consent" | "get_access_logs" | "get_consents" | "get_retention_policies";
    patient_id?: string;
    access_type?: string;
    resource_type?: string;
    resource_id?: string;
    access_reason?: string;
    fields_accessed?: string[];
    consent_type?: string;
    purpose?: string;
    limit?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[HIPAA] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
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

        const body: HIPAARequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get client IP
        const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "0.0.0.0";

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "log_access": {
                const { patient_id, access_type, resource_type, resource_id, access_reason, fields_accessed } = body;

                if (!patient_id || !access_type || !resource_type) {
                    return new Response(
                        JSON.stringify({ error: "patient_id, access_type, and resource_type required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: logId, error } = await supabaseAdmin.rpc("log_phi_access", {
                    p_user_id: user.id,
                    p_patient_id: patient_id,
                    p_access_type: access_type,
                    p_resource_type: resource_type,
                    p_resource_id: resource_id || null,
                    p_access_reason: access_reason || "treatment",
                    p_fields_accessed: fields_accessed || null,
                    p_ip_address: clientIP,
                });

                if (error) throw error;

                logStep("PHI access logged", { logId, patientId: patient_id, accessType: access_type });

                return new Response(
                    JSON.stringify({ success: true, log_id: logId }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "check_consent": {
                const { patient_id, consent_type, purpose } = body;

                if (!patient_id || !consent_type) {
                    return new Response(
                        JSON.stringify({ error: "patient_id and consent_type required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: hasConsent, error } = await supabaseAdmin.rpc("has_patient_consent", {
                    p_patient_id: patient_id,
                    p_consent_type: consent_type,
                    p_purpose: purpose || null,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ has_consent: hasConsent }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "grant_consent": {
                const { consent_type, purpose } = body;

                if (!consent_type || !purpose) {
                    return new Response(
                        JSON.stringify({ error: "consent_type and purpose required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: consent, error } = await supabaseAdmin
                    .from("patient_consents")
                    .upsert({
                        patient_id: user.id,
                        consent_type,
                        purpose,
                        granted: true,
                        granted_at: new Date().toISOString(),
                        revoked_at: null,
                        ip_address: clientIP,
                    })
                    .select()
                    .single();

                if (error) throw error;

                logStep("Consent granted", { consentType: consent_type, purpose });

                return new Response(
                    JSON.stringify({ success: true, consent }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "revoke_consent": {
                const { consent_type, purpose } = body;

                if (!consent_type) {
                    return new Response(
                        JSON.stringify({ error: "consent_type required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                let query = supabaseAdmin
                    .from("patient_consents")
                    .update({ revoked_at: new Date().toISOString() })
                    .eq("patient_id", user.id)
                    .eq("consent_type", consent_type);

                if (purpose) {
                    query = query.eq("purpose", purpose);
                }

                const { error } = await query;

                if (error) throw error;

                logStep("Consent revoked", { consentType: consent_type, purpose });

                return new Response(
                    JSON.stringify({ success: true }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_access_logs": {
                const { limit = 100 } = body;

                // Users can view who accessed their PHI
                const { data: logs, error } = await supabaseAdmin
                    .from("phi_access_logs")
                    .select(`
            *,
            accessor:user_id (email, raw_user_meta_data)
          `)
                    .eq("patient_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (error) throw error;

                return new Response(
                    JSON.stringify({ logs }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_consents": {
                const { data: consents, error } = await supabaseAdmin
                    .from("patient_consents")
                    .select("*")
                    .eq("patient_id", user.id)
                    .order("granted_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ consents }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_retention_policies": {
                const { data: policies, error } = await supabaseAdmin
                    .from("data_retention_policies")
                    .select("*")
                    .order("data_type");

                if (error) throw error;

                return new Response(
                    JSON.stringify({ policies }),
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
