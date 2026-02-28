// IP Whitelist Edge Function
// Manage IP whitelisting for enhanced security

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IPWhitelistRequest {
    action: "check" | "add" | "remove" | "list" | "get_settings" | "update_settings" | "get_logs";
    ip_address?: string;
    label?: string;
    expires_days?: number;
    settings?: {
        whitelist_enabled?: boolean;
        block_vpn?: boolean;
        block_tor?: boolean;
        notify_on_new_ip?: boolean;
    };
    limit?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[IP-WHITELIST] ${step}${detailsStr}`);
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

        const body: IPWhitelistRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get client IP from headers
        const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "0.0.0.0";

        logStep("Processing action", { action, userId: user.id, clientIP });

        switch (action) {
            case "check": {
                const ipToCheck = body.ip_address || clientIP;

                const { data: result, error } = await supabaseAdmin.rpc("is_ip_allowed", {
                    p_user_id: user.id,
                    p_ip_address: ipToCheck,
                });

                if (error) throw error;

                // Log the access attempt
                await supabaseAdmin.rpc("log_ip_access", {
                    p_user_id: user.id,
                    p_ip_address: ipToCheck,
                    p_action: result?.allowed ? "api_allowed" : "api_blocked",
                    p_user_agent: req.headers.get("user-agent"),
                    p_endpoint: "/ip-whitelist",
                });

                return new Response(
                    JSON.stringify({ ...result, checked_ip: ipToCheck }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "add": {
                const { ip_address, label, expires_days } = body;
                const ipToAdd = ip_address || clientIP;

                const { data: whitelistId, error } = await supabaseAdmin.rpc("add_ip_to_whitelist", {
                    p_user_id: user.id,
                    p_ip_address: ipToAdd,
                    p_label: label || "Added via API",
                    p_expires_days: expires_days,
                });

                if (error) throw error;

                logStep("IP added to whitelist", { ip: ipToAdd, whitelistId });

                return new Response(
                    JSON.stringify({ success: true, whitelist_id: whitelistId, ip_address: ipToAdd }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "remove": {
                const { ip_address } = body;

                if (!ip_address) {
                    return new Response(
                        JSON.stringify({ error: "ip_address required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { error } = await supabaseAdmin
                    .from("ip_whitelist")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("ip_address", ip_address);

                if (error) throw error;

                logStep("IP removed from whitelist", { ip: ip_address });

                return new Response(
                    JSON.stringify({ success: true }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "list": {
                const { data: whitelist, error } = await supabaseAdmin
                    .from("ip_whitelist")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ whitelist, current_ip: clientIP }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_settings": {
                let { data: settings, error } = await supabaseAdmin
                    .from("ip_security_settings")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (!settings) {
                    // Create default settings
                    const { data: newSettings } = await supabaseAdmin
                        .from("ip_security_settings")
                        .insert({ user_id: user.id })
                        .select()
                        .single();
                    settings = newSettings;
                }

                if (error && error.code !== "PGRST116") throw error;

                return new Response(
                    JSON.stringify({ settings }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "update_settings": {
                const { settings } = body;

                if (!settings) {
                    return new Response(
                        JSON.stringify({ error: "settings required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: updatedSettings, error } = await supabaseAdmin
                    .from("ip_security_settings")
                    .upsert({
                        user_id: user.id,
                        ...settings,
                        updated_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (error) throw error;

                logStep("Settings updated", { settings });

                return new Response(
                    JSON.stringify({ success: true, settings: updatedSettings }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_logs": {
                const { limit = 50 } = body;

                const { data: logs, error } = await supabaseAdmin
                    .from("ip_access_logs")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (error) throw error;

                return new Response(
                    JSON.stringify({ logs }),
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
