// SOC 2 Audit Edge Function
// Comprehensive audit logging for SOC 2 compliance

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SOC2Request {
    action: "log" | "get_logs" | "create_incident" | "update_incident" | "get_incidents" | "create_access_review" | "get_summary";
    log_data?: {
        action_type: string;
        resource_type?: string;
        resource_id?: string;
        previous_state?: Record<string, unknown>;
        new_state?: Record<string, unknown>;
        action_description?: string;
        compliance_tags?: string[];
    };
    incident_data?: {
        incident_type: string;
        severity: string;
        title: string;
        description: string;
        affected_users?: string[];
        affected_systems?: string[];
    };
    incident_id?: string;
    incident_update?: {
        status?: string;
        containment_actions?: string[];
        remediation_actions?: string[];
        root_cause?: string;
    };
    start_date?: string;
    end_date?: string;
    limit?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[SOC2-AUDIT] ${step}${detailsStr}`);
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

        const body: SOC2Request = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Get client IP
        const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "0.0.0.0";

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "log": {
                const { log_data } = body;

                if (!log_data?.action_type) {
                    return new Response(
                        JSON.stringify({ error: "action_type required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: logId, error } = await supabaseAdmin.rpc("create_soc2_audit_log", {
                    p_actor_id: user.id,
                    p_action_type: log_data.action_type,
                    p_resource_type: log_data.resource_type || null,
                    p_resource_id: log_data.resource_id || null,
                    p_previous_state: log_data.previous_state || null,
                    p_new_state: log_data.new_state || null,
                    p_action_description: log_data.action_description || null,
                    p_ip_address: clientIP,
                    p_compliance_tags: log_data.compliance_tags || null,
                });

                if (error) throw error;

                logStep("Audit log created", { logId, actionType: log_data.action_type });

                return new Response(
                    JSON.stringify({ success: true, log_id: logId }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_logs": {
                const { limit = 100, start_date, end_date } = body;

                let query = supabaseAdmin
                    .from("soc2_audit_logs")
                    .select("*")
                    .eq("actor_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (start_date) {
                    query = query.gte("created_at", start_date);
                }
                if (end_date) {
                    query = query.lte("created_at", end_date);
                }

                const { data: logs, error } = await query;

                if (error) throw error;

                return new Response(
                    JSON.stringify({ logs }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "create_incident": {
                const { incident_data } = body;

                if (!incident_data?.incident_type || !incident_data?.severity || !incident_data?.title || !incident_data?.description) {
                    return new Response(
                        JSON.stringify({ error: "incident_type, severity, title, and description required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: incident, error } = await supabaseAdmin
                    .from("security_incidents")
                    .insert({
                        incident_type: incident_data.incident_type,
                        severity: incident_data.severity,
                        title: incident_data.title,
                        description: incident_data.description,
                        affected_users: incident_data.affected_users || [],
                        affected_systems: incident_data.affected_systems || [],
                        detected_by: "user_report",
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Also create audit log
                await supabaseAdmin.rpc("create_soc2_audit_log", {
                    p_actor_id: user.id,
                    p_action_type: "security.incident_created",
                    p_resource_type: "security_incident",
                    p_resource_id: incident.id,
                    p_action_description: `Created security incident: ${incident_data.title}`,
                    p_ip_address: clientIP,
                    p_compliance_tags: ["soc2"],
                });

                logStep("Security incident created", { incidentId: incident.id, severity: incident_data.severity });

                return new Response(
                    JSON.stringify({ success: true, incident }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "update_incident": {
                const { incident_id, incident_update } = body;

                if (!incident_id || !incident_update) {
                    return new Response(
                        JSON.stringify({ error: "incident_id and incident_update required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const updateData: Record<string, unknown> = {
                    updated_at: new Date().toISOString(),
                };

                if (incident_update.status) {
                    updateData.status = incident_update.status;
                    if (incident_update.status === "contained") {
                        updateData.contained_at = new Date().toISOString();
                    } else if (incident_update.status === "resolved") {
                        updateData.resolved_at = new Date().toISOString();
                    } else if (incident_update.status === "closed") {
                        updateData.closed_at = new Date().toISOString();
                    }
                }
                if (incident_update.containment_actions) updateData.containment_actions = incident_update.containment_actions;
                if (incident_update.remediation_actions) updateData.remediation_actions = incident_update.remediation_actions;
                if (incident_update.root_cause) updateData.root_cause = incident_update.root_cause;

                const { data: incident, error } = await supabaseAdmin
                    .from("security_incidents")
                    .update(updateData)
                    .eq("id", incident_id)
                    .select()
                    .single();

                if (error) throw error;

                logStep("Incident updated", { incidentId: incident_id, status: incident_update.status });

                return new Response(
                    JSON.stringify({ success: true, incident }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_incidents": {
                const { limit = 50 } = body;

                const { data: incidents, error } = await supabaseAdmin
                    .from("security_incidents")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (error) throw error;

                return new Response(
                    JSON.stringify({ incidents }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_summary": {
                const { start_date, end_date } = body;

                const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const endDate = end_date || new Date().toISOString();

                const { data: summary, error } = await supabaseAdmin.rpc("get_audit_summary", {
                    p_start_date: startDate,
                    p_end_date: endDate,
                });

                if (error) throw error;

                // Get additional stats
                const { data: incidentStats } = await supabaseAdmin
                    .from("security_incidents")
                    .select("status, severity")
                    .gte("created_at", startDate)
                    .lte("created_at", endDate);

                return new Response(
                    JSON.stringify({
                        period: { start: startDate, end: endDate },
                        action_summary: summary,
                        incidents: {
                            total: incidentStats?.length || 0,
                            by_status: (incidentStats || []).reduce((acc, i) => {
                                acc[i.status] = (acc[i.status] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>),
                            by_severity: (incidentStats || []).reduce((acc, i) => {
                                acc[i.severity] = (acc[i.severity] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>),
                        },
                    }),
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
