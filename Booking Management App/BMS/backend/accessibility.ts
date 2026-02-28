// Accessibility Preferences Edge Function
// Manage user accessibility settings

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccessibilityRequest {
    action: "get" | "update" | "submit_feedback" | "get_defaults";
    preferences?: {
        high_contrast_mode?: boolean;
        font_size?: string;
        reduced_motion?: boolean;
        color_blind_mode?: string;
        screen_reader_optimized?: boolean;
        keyboard_navigation?: boolean;
        focus_indicators_enhanced?: boolean;
        dyslexia_font?: boolean;
    };
    feedback?: {
        page_url: string;
        issue_type: string;
        description: string;
        assistive_technology?: string;
    };
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[ACCESSIBILITY] ${step}${detailsStr}`);
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

        const supabaseClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader || "" } },
        });

        const { data: { user } } = await supabaseClient.auth.getUser();

        const body: AccessibilityRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user?.id });

        switch (action) {
            case "get_defaults": {
                // Return default preferences (no auth required)
                const defaults = {
                    high_contrast_mode: false,
                    font_size: "medium",
                    reduced_motion: false,
                    color_blind_mode: "none",
                    screen_reader_optimized: false,
                    audio_descriptions: false,
                    captions_enabled: true,
                    keyboard_navigation: true,
                    focus_indicators_enhanced: false,
                    extended_time_limits: false,
                    click_assistance: false,
                    simple_language: false,
                    reading_guide: false,
                    dyslexia_font: false,
                };

                return new Response(
                    JSON.stringify({ preferences: defaults }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get": {
                if (!user) {
                    // Return defaults for anonymous users
                    return new Response(
                        JSON.stringify({ preferences: null, using_defaults: true }),
                        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: prefs } = await supabaseAdmin.rpc("get_accessibility_preferences", {
                    p_user_id: user.id,
                });

                return new Response(
                    JSON.stringify({ preferences: prefs }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "update": {
                if (!user) {
                    return new Response(
                        JSON.stringify({ error: "Authorization required" }),
                        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { preferences } = body;

                if (!preferences) {
                    return new Response(
                        JSON.stringify({ error: "preferences required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: updatedPrefs, error } = await supabaseAdmin
                    .from("user_accessibility_preferences")
                    .upsert({
                        user_id: user.id,
                        ...preferences,
                        updated_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (error) throw error;

                logStep("Preferences updated", { userId: user.id });

                return new Response(
                    JSON.stringify({ success: true, preferences: updatedPrefs }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "submit_feedback": {
                const { feedback } = body;

                if (!feedback?.page_url || !feedback?.issue_type || !feedback?.description) {
                    return new Response(
                        JSON.stringify({ error: "page_url, issue_type, and description required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: feedbackRecord, error } = await supabaseAdmin
                    .from("accessibility_feedback")
                    .insert({
                        user_id: user?.id || null,
                        page_url: feedback.page_url,
                        issue_type: feedback.issue_type,
                        description: feedback.description,
                        assistive_technology: feedback.assistive_technology,
                        browser: req.headers.get("user-agent"),
                    })
                    .select()
                    .single();

                if (error) throw error;

                logStep("Feedback submitted", { feedbackId: feedbackRecord.id });

                return new Response(
                    JSON.stringify({ success: true, feedback_id: feedbackRecord.id }),
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
