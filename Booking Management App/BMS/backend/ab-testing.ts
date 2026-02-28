// A/B Testing Edge Function
// Manage experiments and variant assignments

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ABTestRequest {
    action: "create" | "list" | "get" | "update" | "get_variant" | "record_conversion" | "get_results";
    experiment_id?: string;
    experiment_data?: {
        name: string;
        description?: string;
        experiment_type: string;
        target_entity: string;
        target_entity_id?: string;
        variants: Array<{
            name: string;
            is_control: boolean;
            variant_data: Record<string, unknown>;
            weight: number;
        }>;
    };
    session_id?: string;
    conversion_value?: number;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[AB-TESTING] ${step}${detailsStr}`);
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

        const body: ABTestRequest = await req.json();
        const { action } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        logStep("Processing action", { action, userId: user?.id });

        switch (action) {
            case "create": {
                if (!user) {
                    return new Response(
                        JSON.stringify({ error: "Authorization required" }),
                        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { experiment_data } = body;

                if (!experiment_data?.name || !experiment_data?.variants?.length) {
                    return new Response(
                        JSON.stringify({ error: "name and variants required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Create experiment
                const { data: experiment, error: expError } = await supabaseAdmin
                    .from("ab_experiments")
                    .insert({
                        provider_id: user.id,
                        name: experiment_data.name,
                        description: experiment_data.description,
                        experiment_type: experiment_data.experiment_type,
                        target_entity: experiment_data.target_entity,
                        target_entity_id: experiment_data.target_entity_id,
                        status: "draft",
                    })
                    .select()
                    .single();

                if (expError) throw expError;

                // Create variants
                const variants = experiment_data.variants.map(v => ({
                    experiment_id: experiment.id,
                    name: v.name,
                    is_control: v.is_control,
                    variant_data: v.variant_data,
                    weight: v.weight,
                }));

                const { data: createdVariants, error: varError } = await supabaseAdmin
                    .from("ab_variants")
                    .insert(variants)
                    .select();

                if (varError) throw varError;

                logStep("Experiment created", { experimentId: experiment.id });

                return new Response(
                    JSON.stringify({ success: true, experiment, variants: createdVariants }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "list": {
                if (!user) {
                    return new Response(
                        JSON.stringify({ error: "Authorization required" }),
                        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: experiments, error } = await supabaseAdmin
                    .from("ab_experiments")
                    .select(`
            *,
            variants:ab_variants (*)
          `)
                    .eq("provider_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                return new Response(
                    JSON.stringify({ experiments }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get": {
                const { experiment_id } = body;

                if (!experiment_id) {
                    return new Response(
                        JSON.stringify({ error: "experiment_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: experiment, error } = await supabaseAdmin
                    .from("ab_experiments")
                    .select(`
            *,
            variants:ab_variants (*)
          `)
                    .eq("id", experiment_id)
                    .single();

                if (error) throw error;

                return new Response(
                    JSON.stringify({ experiment }),
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

                const { experiment_id, experiment_data } = body;

                if (!experiment_id) {
                    return new Response(
                        JSON.stringify({ error: "experiment_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const updateData: Record<string, unknown> = {
                    updated_at: new Date().toISOString(),
                };

                if (experiment_data?.name) updateData.name = experiment_data.name;
                if (experiment_data?.description) updateData.description = experiment_data.description;

                const { data: experiment, error } = await supabaseAdmin
                    .from("ab_experiments")
                    .update(updateData)
                    .eq("id", experiment_id)
                    .eq("provider_id", user.id)
                    .select()
                    .single();

                if (error) throw error;

                return new Response(
                    JSON.stringify({ success: true, experiment }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_variant": {
                const { experiment_id, session_id } = body;

                if (!experiment_id) {
                    return new Response(
                        JSON.stringify({ error: "experiment_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: variantId, error } = await supabaseAdmin.rpc("assign_ab_variant", {
                    p_experiment_id: experiment_id,
                    p_user_id: user?.id || null,
                    p_session_id: session_id || null,
                });

                if (error) throw error;

                // Get variant details
                const { data: variant } = await supabaseAdmin
                    .from("ab_variants")
                    .select("*")
                    .eq("id", variantId)
                    .single();

                return new Response(
                    JSON.stringify({ variant_id: variantId, variant }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "record_conversion": {
                const { experiment_id, session_id, conversion_value } = body;

                if (!experiment_id) {
                    return new Response(
                        JSON.stringify({ error: "experiment_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: success, error } = await supabaseAdmin.rpc("record_ab_conversion", {
                    p_experiment_id: experiment_id,
                    p_user_id: user?.id || null,
                    p_session_id: session_id || null,
                    p_value: conversion_value || null,
                });

                if (error) throw error;

                logStep("Conversion recorded", { experimentId: experiment_id, value: conversion_value });

                return new Response(
                    JSON.stringify({ success }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "get_results": {
                const { experiment_id } = body;

                if (!experiment_id) {
                    return new Response(
                        JSON.stringify({ error: "experiment_id required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const { data: results, error } = await supabaseAdmin.rpc("calculate_ab_significance", {
                    p_experiment_id: experiment_id,
                });

                if (error) throw error;

                // Get experiment details
                const { data: experiment } = await supabaseAdmin
                    .from("ab_experiments")
                    .select("*")
                    .eq("id", experiment_id)
                    .single();

                return new Response(
                    JSON.stringify({ experiment, results }),
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
