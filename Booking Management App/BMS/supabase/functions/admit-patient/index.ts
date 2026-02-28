import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdmitPatientRequest {
    appointment_id: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify user
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error("Auth error:", authError);
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { appointment_id }: AdmitPatientRequest = await req.json();

        if (!appointment_id) {
            return new Response(
                JSON.stringify({ error: "appointment_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Admitting patient for appointment: ${appointment_id}`);

        // Get appointment details
        const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .select(`
        *,
        provider:provider_profiles(id, user_id)
      `)
            .eq("id", appointment_id)
            .single();

        if (appointmentError || !appointment) {
            console.error("Appointment error:", appointmentError);
            return new Response(
                JSON.stringify({ error: "Appointment not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify caller is the provider
        const isProvider = appointment.provider?.user_id === user.id;
        if (!isProvider) {
            return new Response(
                JSON.stringify({ error: "Only the provider can admit patients" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if patient is actually waiting
        if (appointment.video_status !== "patient_waiting") {
            return new Response(
                JSON.stringify({ error: "No patient is waiting", current_status: appointment.video_status }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Update video status to admitted
        const { error: updateError } = await supabase
            .from("appointments")
            .update({ video_status: "admitted" })
            .eq("id", appointment_id);

        if (updateError) {
            console.error("Failed to update video status:", updateError);
            return new Response(
                JSON.stringify({ error: "Failed to admit patient" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Patient admitted for appointment: ${appointment_id}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Patient admitted successfully",
                room_url: appointment.meeting_url
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error admitting patient:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
