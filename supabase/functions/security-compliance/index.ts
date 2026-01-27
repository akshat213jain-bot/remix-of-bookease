// Security Compliance Edge Function
// PCI DSS security headers and event logging

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security headers for PCI DSS compliance
const securityHeaders = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
};

interface SecurityRequest {
    action: "log_event" | "check_login" | "record_failed_login" | "get_headers" | "report_csp_violation" | "get_my_events";
    event_type?: string;
    identifier?: string;
    details?: Record<string, unknown>;
    csp_report?: {
        document_uri?: string;
        violated_directive?: string;
        blocked_uri?: string;
    };
    limit?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[SECURITY] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const authHeader = req.headers.get("Authorization");

        const supabaseClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader || "" } },
        });

        const { data: { user } } = await supabaseClient.auth.getUser();

        const body: SecurityRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get client IP
        const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "0.0.0.0";

        const userAgent = req.headers.get("user-agent") || "";

        logStep("Processing action", { action, userId: user?.id, ip: clientIP });

        switch (action) {
            case "get_headers": {
                // Return security headers configuration
                const { data: headers, error } = await supabaseAdmin
                    .from("security_headers_config")
                    .select("*")
                    .eq("is_active", true);

                if (error) throw error;

                return new Response(
                    JSON.stringify({ headers, applied_headers: securityHeaders }),
                    { status: 200, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                );
            }

            case "log_event": {
                const { event_type, details } = body;

                if (!event_type) {
                    return new Response(
                        JSON.stringify({ error: "event_type required" }),
                        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: eventId, error } = await supabaseAdmin.rpc("log_security_event", {
                    p_event_type: event_type,
                    p_user_id: user?.id || null,
                    p_ip_address: clientIP,
                    p_user_agent: userAgent,
                    p_details: details || {},
                });

                if (error) throw error;

                logStep("Security event logged", { eventType: event_type, eventId });

                return new Response(
                    JSON.stringify({ success: true, event_id: eventId }),
                    { status: 200, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                );
            }

            case "check_login": {
                const { identifier } = body;

                if (!identifier) {
                    return new Response(
                        JSON.stringify({ error: "identifier required" }),
                        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: isBlocked, error } = await supabaseAdmin.rpc("is_login_blocked", {
                    p_identifier: identifier,
                    p_ip_address: clientIP,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ blocked: isBlocked }),
                    { status: 200, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                );
            }

            case "record_failed_login": {
                const { identifier } = body;

                if (!identifier) {
                    return new Response(
                        JSON.stringify({ error: "identifier required" }),
                        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                    );
                }

                await supabaseAdmin.rpc("record_failed_login", {
                    p_identifier: identifier,
                    p_ip_address: clientIP,
                    p_user_agent: userAgent,
                });

                // Also log to security events
                await supabaseAdmin.rpc("log_security_event", {
                    p_event_type: "login_failure",
                    p_ip_address: clientIP,
                    p_user_agent: userAgent,
                    p_details: { identifier },
                });

                logStep("Failed login recorded", { identifier, ip: clientIP });

                return new Response(
                    JSON.stringify({ success: true }),
                    { status: 200, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                );
            }

            case "report_csp_violation": {
                const { csp_report } = body;

                if (!csp_report) {
                    return new Response(
                        JSON.stringify({ error: "csp_report required" }),
                        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { error } = await supabaseAdmin
                    .from("csp_violations")
                    .insert({
                        document_uri: csp_report.document_uri,
                        violated_directive: csp_report.violated_directive,
                        blocked_uri: csp_report.blocked_uri,
                        user_id: user?.id || null,
                        ip_address: clientIP,
                    });

                if (error) throw error;

                logStep("CSP violation reported", { directive: csp_report.violated_directive });

                return new Response(
                    JSON.stringify({ success: true }),
                    { status: 200, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_my_events": {
                if (!user) {
                    return new Response(
                        JSON.stringify({ error: "Authorization required" }),
                        { status: 401, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { limit = 50 } = body;

                const { data: events, error } = await supabaseAdmin
                    .from("security_events")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (error) throw error;

                return new Response(
                    JSON.stringify({ events }),
                    { status: 200, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                );
            }

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid action" }),
                    { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
                );
        }
    } catch (error) {
        logStep("Error", { error: error instanceof Error ? error.message : String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } }
        );
    }
});
