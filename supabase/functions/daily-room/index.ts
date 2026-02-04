import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailyRoomRequest {
  action: "create" | "get-token" | "delete";
  appointmentId?: string;
  roomUrl?: string;
  roomName?: string;
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

    const body: DailyRoomRequest = await req.json();
    const { action, appointmentId, roomUrl, roomName } = body;

    console.log(`Daily room action: ${action}, user: ${user.id}`);

    // CREATE ROOM
    if (action === "create") {
      // Generate unique room name
      const uniqueRoomName = `room-${user.id.slice(0, 8)}-${Date.now()}`;
      
      // Calculate expiry (24 hours from now)
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          name: uniqueRoomName,
          privacy: "private",
          properties: {
            exp: Math.floor(expiryTime.getTime() / 1000),
            enable_chat: true,
            enable_screenshare: true,
            max_participants: 10,
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

      // Generate meeting token for the creator
      const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            room_name: uniqueRoomName,
            user_id: user.id,
            user_name: user.email?.split("@")[0] || "User",
            is_owner: true,
            exp: Math.floor(expiryTime.getTime() / 1000),
          },
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Failed to create meeting token");
      }

      const tokenData = await tokenResponse.json();

      // Update appointment if provided
      if (appointmentId) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            meeting_url: dailyRoom.url,
            meeting_room_name: uniqueRoomName,
          })
          .eq("id", appointmentId);

        if (updateError) {
          console.error("Failed to update appointment:", updateError);
        }
      }

      return new Response(
        JSON.stringify({
          room_url: dailyRoom.url,
          room_name: uniqueRoomName,
          token: tokenData.token,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET TOKEN
    if (action === "get-token") {
      if (!roomUrl) {
        return new Response(
          JSON.stringify({ error: "roomUrl is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract room name from URL
      const extractedRoomName = roomUrl.split("/").pop();
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            room_name: extractedRoomName,
            user_id: user.id,
            user_name: user.email?.split("@")[0] || "User",
            is_owner: false,
            exp: Math.floor(expiryTime.getTime() / 1000),
          },
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Failed to create meeting token:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to generate meeting token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData = await tokenResponse.json();

      return new Response(
        JSON.stringify({ token: tokenData.token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE ROOM
    if (action === "delete") {
      if (!roomName) {
        return new Response(
          JSON.stringify({ error: "roomName is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const deleteResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errorText = await deleteResponse.text();
        console.error("Failed to delete room:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to delete room" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in daily-room function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
