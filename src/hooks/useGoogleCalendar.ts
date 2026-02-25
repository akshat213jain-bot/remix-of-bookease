import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CalendarEventDetails {
  summary: string;
  description: string;
  start_time: string;
  end_time: string;
  attendee_email?: string;
  location?: string;
  is_video?: boolean;
  meeting_url?: string;
}

interface UseGoogleCalendarReturn {
  isConnected: boolean;
  isSyncing: boolean;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => void;
  syncAppointment: (appointmentId: string, details: CalendarEventDetails) => Promise<string | null>;
  updateCalendarEvent: (appointmentId: string, eventId: string, details: CalendarEventDetails) => Promise<boolean>;
  deleteCalendarEvent: (appointmentId: string, eventId: string) => Promise<boolean>;
}

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export const useGoogleCalendar = (): UseGoogleCalendarReturn => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  // Use sessionStorage instead of localStorage to limit token lifetime to browser session
  const getAccessToken = (): string | null => {
    return sessionStorage.getItem("google_calendar_token");
  };

  const isConnected = !!getAccessToken();

  const connectCalendar = async (): Promise<void> => {
    if (!GOOGLE_CLIENT_ID) {
      toast({
        title: "Configuration Required",
        description: "Google Calendar integration is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment.",
        variant: "destructive",
      });
      return;
    }

    // Build OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("scope", GOOGLE_SCOPES);
    authUrl.searchParams.set("access_type", "online");
    authUrl.searchParams.set("prompt", "consent");

    // Open OAuth popup
    const popup = window.open(
      authUrl.toString(),
      "google-calendar-auth",
      "width=500,height=600,popup=yes"
    );

    // Listen for the callback
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "google-oauth-success") {
        sessionStorage.setItem("google_calendar_token", event.data.access_token);
        toast({
          title: "Calendar Connected",
          description: "Your Google Calendar has been connected successfully.",
        });
        window.removeEventListener("message", handleMessage);
      } else if (event.data?.type === "google-oauth-error") {
        toast({
          title: "Connection Failed",
          description: event.data.error || "Failed to connect Google Calendar",
          variant: "destructive",
        });
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);

    // Check if popup was blocked
    if (!popup) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to connect your Google Calendar.",
        variant: "destructive",
      });
    }
  };

  const disconnectCalendar = (): void => {
    sessionStorage.removeItem("google_calendar_token");
    toast({
      title: "Calendar Disconnected",
      description: "Your Google Calendar has been disconnected.",
    });
  };

  const syncAppointment = async (
    appointmentId: string,
    details: CalendarEventDetails
  ): Promise<string | null> => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      toast({
        title: "Not Connected",
        description: "Please connect your Google Calendar first.",
        variant: "destructive",
      });
      return null;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-calendar", {
        body: {
          action: "create",
          appointment_id: appointmentId,
          event_details: details,
        },
        headers: {
          "X-Google-Access-Token": accessToken,
        },
      });

      if (error) throw error;

      toast({
        title: "Calendar Synced",
        description: "Appointment has been added to your Google Calendar.",
      });

      return data.event_id;
    } catch (error) {
      console.error("Calendar sync error:", error);
      
      // Handle token expiration
      if (error instanceof Error && error.message.includes("401")) {
        sessionStorage.removeItem("google_calendar_token");
        toast({
          title: "Session Expired",
          description: "Please reconnect your Google Calendar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to sync appointment to Google Calendar.",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateCalendarEvent = async (
    appointmentId: string,
    eventId: string,
    details: CalendarEventDetails
  ): Promise<boolean> => {
    const accessToken = getAccessToken();
    if (!accessToken) return false;

    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-google-calendar", {
        body: {
          action: "update",
          appointment_id: appointmentId,
          event_id: eventId,
          event_details: details,
        },
        headers: {
          "X-Google-Access-Token": accessToken,
        },
      });

      if (error) throw error;

      toast({
        title: "Calendar Updated",
        description: "Your calendar event has been updated.",
      });

      return true;
    } catch (error) {
      console.error("Calendar update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update calendar event.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteCalendarEvent = async (
    appointmentId: string,
    eventId: string
  ): Promise<boolean> => {
    const accessToken = getAccessToken();
    if (!accessToken) return false;

    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-google-calendar", {
        body: {
          action: "delete",
          appointment_id: appointmentId,
          event_id: eventId,
        },
        headers: {
          "X-Google-Access-Token": accessToken,
        },
      });

      if (error) throw error;

      toast({
        title: "Event Removed",
        description: "The calendar event has been removed.",
      });

      return true;
    } catch (error) {
      console.error("Calendar delete error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to remove calendar event.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isConnected,
    isSyncing,
    connectCalendar,
    disconnectCalendar,
    syncAppointment,
    updateCalendarEvent,
    deleteCalendarEvent,
  };
};

// Helper to format appointment to calendar event details
export const formatAppointmentForCalendar = (appointment: {
  appointment_date: string;
  start_time: string;
  end_time: string;
  provider_name?: string;
  patient_name?: string;
  is_video_consultation?: boolean;
  meeting_url?: string;
  notes?: string;
  location?: string;
}): CalendarEventDetails => {
  const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const endDateTime = new Date(`${appointment.appointment_date}T${appointment.end_time}`);

  return {
    summary: appointment.provider_name 
      ? `Appointment with ${appointment.provider_name}`
      : `Appointment with ${appointment.patient_name || "Patient"}`,
    description: [
      appointment.notes || "",
      appointment.is_video_consultation ? "This is a video consultation." : "",
      appointment.meeting_url ? `Join here: ${appointment.meeting_url}` : "",
    ].filter(Boolean).join("\n"),
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
    is_video: appointment.is_video_consultation,
    meeting_url: appointment.meeting_url,
    location: appointment.location,
  };
};
