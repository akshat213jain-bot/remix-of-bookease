// Social Login Edge Function
// Handle social authentication providers

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SocialLoginRequest {
    action: "get_providers" | "link" | "unlink" | "get_connected";
    provider?: string;
    provider_user_id?: string;
    provider_email?: string;
    provider_name?: string;
    provider_avatar?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[SOCIAL-LOGIN] ${step}${detailsStr}`);
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

        const body: SocialLoginRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user.id });

        switch (action) {
            case "get_providers": {
                // Return available providers configuration
                const providers = [
                    {
                        id: "google",
                        name: "Google",
                        icon: "google",
                        color: "#4285F4",
                        enabled: true,
                    },
                    {
                        id: "facebook",
                        name: "Facebook",
                        icon: "facebook",
                        color: "#1877F2",
                        enabled: true,
                    },
                    {
                        id: "apple",
                        name: "Apple",
                        icon: "apple",
                        color: "#000000",
                        enabled: true,
                    },
                    {
                        id: "twitter",
                        name: "Twitter",
                        icon: "twitter",
                        color: "#1DA1F2",
                        enabled: false,
                    },
                    {
                        id: "github",
                        name: "GitHub",
                        icon: "github",
                        color: "#333333",
                        enabled: false,
                    },
                ];

                return new Response(
                    JSON.stringify({ providers }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_connected": {
                const { data: connections, error } = await supabaseAdmin.rpc("get_connected_providers", {
                    p_user_id: user.id,
                });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ connections: connections || [] }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "link": {
                const { provider, provider_user_id, provider_email, provider_name, provider_avatar } = body;

                if (!provider || !provider_user_id) {
                    return new Response(
                        JSON.stringify({ error: "provider and provider_user_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: connectionId, error: linkError } = await supabaseAdmin.rpc("link_social_account", {
                    p_user_id: user.id,
                    p_provider: provider,
                    p_provider_user_id: provider_user_id,
                    p_email: provider_email,
                    p_name: provider_name,
                    p_avatar: provider_avatar,
                });

                if (linkError) throw linkError;

                logStep("Account linked", { provider, connectionId });

                return new Response(
                    JSON.stringify({ success: true, connection_id: connectionId }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "unlink": {
                const { provider } = body;

                if (!provider) {
                    return new Response(
                        JSON.stringify({ error: "provider required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Check if user has other login methods
                const { data: connections } = await supabaseAdmin
                    .from("social_connections")
                    .select("id")
                    .eq("user_id", user.id);

                const hasPassword = user.app_metadata?.provider === "email";

                if ((connections?.length || 0) <= 1 && !hasPassword) {
                    return new Response(
                        JSON.stringify({
                            error: "Cannot unlink last login method. Add a password or link another account first."
                        }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Delete connection
                const { error: unlinkError } = await supabaseAdmin
                    .from("social_connections")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("provider", provider);

                if (unlinkError) throw unlinkError;

                // Log the action
                await supabaseAdmin.from("social_login_logs").insert({
                    user_id: user.id,
                    provider,
                    action: "unlink",
                });

                logStep("Account unlinked", { provider });

                return new Response(
                    JSON.stringify({ success: true }),
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
