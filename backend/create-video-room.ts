/**
 * Create Video Room Edge Function
 * 
 * Creates a Daily.co video room for video consultations.
 * 
 * Deployed location: supabase/functions/create-video-room/index.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateRoomRequest {
  appointment_id: string;
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

    const { appointment_id }: CreateRoomRequest = await req.json();

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: "appointment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating video room for appointment: ${appointment_id}`);

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

    // Check if room already exists
    if (appointment.meeting_url && appointment.meeting_room_name) {
      console.log(`Room already exists: ${appointment.meeting_room_name}`);
      return new Response(
        JSON.stringify({ 
          room_url: appointment.meeting_url,
          room_name: appointment.meeting_room_name 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate room expiry (appointment end time + 1 hour buffer)
    const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.end_time}`);
    const expiryTime = new Date(appointmentDate.getTime() + 60 * 60 * 1000);

    // Create Daily.co room
    const roomName = `appointment-${appointment_id}-${Date.now()}`;
    
    const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: Math.floor(expiryTime.getTime() / 1000),
          enable_chat: true,
          enable_screenshare: true,
          max_participants: 2,
          enable_prejoin_ui: true,
          enable_knocking: false,
          start_audio_off: false,
          start_video_off: false,
        },
      }),
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      console.error("Daily.co API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create video room" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dailyRoom = await dailyResponse.json();
    console.log(`Room created: ${dailyRoom.url}`);

    // Update appointment with meeting URL
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        meeting_url: dailyRoom.url,
        meeting_room_name: roomName,
      })
      .eq("id", appointment_id);

    if (updateError) {
      console.error("Failed to update appointment:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        room_url: dailyRoom.url,
        room_name: roomName 
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
