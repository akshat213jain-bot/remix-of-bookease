import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

 // Static Daily.co room URL for this app
 const STATIC_ROOM_URL = "https://easebooking.daily.co/AppointmentApp";
 const STATIC_ROOM_NAME = "AppointmentApp";
 
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoRoomRequest {
  appointment_id: string;
   action?: "join" | "create";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      console.error("DAILY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Video service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { appointment_id, action = "join" }: VideoRoomRequest = await req.json();

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: "appointment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Video room request for appointment: ${appointment_id}, action: ${action}, user: ${user.id}`);

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

    // Verify user is either the patient or provider
    const isPatient = appointment.user_id === user.id;
    const isProvider = appointment.provider?.user_id === user.id;

    if (!isPatient && !isProvider) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this appointment" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's profile for display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();
 
    const userName = profile?.full_name || user.email?.split("@")[0] || "User";
 
    // Calculate token expiry (appointment end time + 2 hours buffer)
    const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.end_time}`);
    const expiryTime = new Date(appointmentDate.getTime() + 2 * 60 * 60 * 1000);
 
    // Generate meeting token for the static room
    console.log(`Generating token for user ${userName} in room ${STATIC_ROOM_NAME}`);
 
    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: STATIC_ROOM_NAME,
          user_id: user.id,
          user_name: userName,
          is_owner: isProvider,
          exp: Math.floor(expiryTime.getTime() / 1000),
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });
 
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Daily.co token API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate meeting token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
    const tokenData = await tokenResponse.json();
    console.log(`Token generated successfully for ${userName}`);
 
    // Update appointment with meeting URL if not already set
    if (!appointment.meeting_url) {
      await supabase
        .from("appointments")
        .update({
          meeting_url: STATIC_ROOM_URL,
          meeting_room_name: STATIC_ROOM_NAME,
        })
        .eq("id", appointment_id);
    }
 
    // Return room URL with token
    return new Response(
      JSON.stringify({
        room_url: `${STATIC_ROOM_URL}?t=${tokenData.token}`,
        room_name: STATIC_ROOM_NAME,
        token: tokenData.token,
        user_name: userName,
        is_provider: isProvider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating video room:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});