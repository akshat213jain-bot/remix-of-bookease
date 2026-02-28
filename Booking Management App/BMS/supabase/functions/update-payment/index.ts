import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service_role client for the actual update (bypasses trigger)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller is a provider or admin
    const { data: roleData } = await adminClient.rpc("get_user_role", { _user_id: userId });
    if (roleData !== "provider" && roleData !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: only providers/admins can update payments" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appointment_id, payment_status, payment_method, payment_amount } = await req.json();

    if (!appointment_id || !payment_status) {
      return new Response(JSON.stringify({ error: "appointment_id and payment_status are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If provider, verify they own this appointment
    if (roleData === "provider") {
      const { data: providerProfile } = await adminClient
        .from("provider_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!providerProfile) {
        return new Response(JSON.stringify({ error: "Provider profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: appointment } = await adminClient
        .from("appointments")
        .select("provider_id")
        .eq("id", appointment_id)
        .maybeSingle();

      if (!appointment || appointment.provider_id !== providerProfile.id) {
        return new Response(JSON.stringify({ error: "Not your appointment" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const updateData: Record<string, unknown> = {
      payment_status,
      payment_method: payment_status === "paid" ? payment_method : null,
      payment_date: payment_status === "paid" ? new Date().toISOString() : null,
    };

    if (payment_amount !== undefined) {
      updateData.payment_amount = payment_amount;
    }

    const { error: updateError } = await adminClient
      .from("appointments")
      .update(updateData)
      .eq("id", appointment_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
