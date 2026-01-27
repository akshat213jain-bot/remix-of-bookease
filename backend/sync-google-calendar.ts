/**
 * Sync Google Calendar Edge Function
 * 
 * Manages Google Calendar integration:
 * - Create calendar events for appointments
 * - Update existing events
 * - Delete events when appointments are cancelled
 * 
 * Deployed location: supabase/functions/sync-google-calendar/index.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GOOGLE-CALENDAR] ${step}${detailsStr}`);
};

interface CalendarRequest {
  appointment_id: string;
  action: "create" | "update" | "delete";
  access_token: string;
  event_details?: {
    summary: string;
    description: string;
    start_time: string;
    end_time: string;
    attendee_email?: string;
    location?: string;
    is_video?: boolean;
    meeting_url?: string;
  };
  event_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Auth error", { error: userError?.message });
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CalendarRequest = await req.json();
    const { action, access_token, event_details, event_id, appointment_id } = body;

    if (!access_token) {
      return new Response(JSON.stringify({ error: "Google access token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(`Processing ${action} action`, { appointmentId: appointment_id });

    const calendarId = "primary";
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    let response: Response;

    switch (action) {
      case "create": {
        if (!event_details) {
          return new Response(JSON.stringify({ error: "Event details required for create" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const eventPayload = {
          summary: event_details.summary,
          description: event_details.description,
          start: {
            dateTime: event_details.start_time,
            timeZone: "UTC",
          },
          end: {
            dateTime: event_details.end_time,
            timeZone: "UTC",
          },
          location: event_details.is_video 
            ? event_details.meeting_url 
            : event_details.location,
          attendees: event_details.attendee_email 
            ? [{ email: event_details.attendee_email }] 
            : undefined,
          conferenceData: event_details.is_video && event_details.meeting_url
            ? {
                entryPoints: [{
                  entryPointType: "video",
                  uri: event_details.meeting_url,
                  label: "Join Video Consultation",
                }],
              }
            : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 1440 }, // 24 hours
              { method: "popup", minutes: 30 },   // 30 minutes
            ],
          },
          extendedProperties: {
            private: {
              appointment_id: appointment_id,
            },
          },
        };

        response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          logStep("Create event failed", { error: errorData });
          return new Response(JSON.stringify({ error: errorData.error?.message || "Failed to create event" }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const createdEvent = await response.json();
        logStep("Event created", { eventId: createdEvent.id });

        return new Response(JSON.stringify({ 
          success: true, 
          event_id: createdEvent.id,
          html_link: createdEvent.htmlLink,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        if (!event_id || !event_details) {
          return new Response(JSON.stringify({ error: "Event ID and details required for update" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updatePayload = {
          summary: event_details.summary,
          description: event_details.description,
          start: {
            dateTime: event_details.start_time,
            timeZone: "UTC",
          },
          end: {
            dateTime: event_details.end_time,
            timeZone: "UTC",
          },
          location: event_details.is_video 
            ? event_details.meeting_url 
            : event_details.location,
        };

        response = await fetch(`${baseUrl}/${event_id}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          logStep("Update event failed", { error: errorData });
          return new Response(JSON.stringify({ error: errorData.error?.message || "Failed to update event" }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updatedEvent = await response.json();
        logStep("Event updated", { eventId: updatedEvent.id });

        return new Response(JSON.stringify({ 
          success: true, 
          event_id: updatedEvent.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        if (!event_id) {
          return new Response(JSON.stringify({ error: "Event ID required for delete" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        response = await fetch(`${baseUrl}/${event_id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${access_token}`,
          },
        });

        if (!response.ok && response.status !== 204) {
          const errorData = await response.json();
          logStep("Delete event failed", { error: errorData });
          return new Response(JSON.stringify({ error: errorData.error?.message || "Failed to delete event" }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        logStep("Event deleted", { eventId: event_id });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    logStep("Error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Calendar sync failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
