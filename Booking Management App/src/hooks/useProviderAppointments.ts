import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProviderProfile, useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/hooks/useNotifications";
import { format } from "date-fns";

type AppointmentStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

export interface ProviderAppointment {
  id: string;
  user_id: string;
  provider_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  is_video_consultation: boolean | null;
  meeting_url: string | null;
  meeting_room_name: string | null;
  reschedule_requested_by: "user" | "provider" | null;
  proposed_date: string | null;
  proposed_start_time: string | null;
  proposed_end_time: string | null;
  reschedule_reason: string | null;
  user_profile?: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

export const useProviderAppointments = () => {
  const { providerProfile } = useProviderProfile();
  const { profile: providerUserProfile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const providerId = providerProfile?.id;

  // Fetch provider's appointments
  const appointmentsQuery = useQuery({
    queryKey: ["provider-appointments", providerId],
    queryFn: async (): Promise<ProviderAppointment[]> => {
      if (!providerId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("*")
        .eq("provider_id", providerId)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch user profiles for appointments
      const userIds: string[] = [];
      data.forEach((a: ProviderAppointment) => {
        if (a.user_id && !userIds.includes(a.user_id)) {
          userIds.push(a.user_id);
        }
      });

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone, avatar_url")
          .in("user_id", userIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]));
          data.forEach((appointment: ProviderAppointment) => {
            appointment.user_profile = profileMap.get(appointment.user_id);
          });
        }
      }

      return data;
    },
    enabled: !!providerId,
  });

  // Update appointment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      cancellation_reason,
      appointment 
    }: { 
      id: string; 
      status: AppointmentStatus; 
      cancellation_reason?: string;
      appointment?: ProviderAppointment;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("appointments")
        .update({
          status,
          cancellation_reason: cancellation_reason || null,
        })
        .eq("id", id);

      if (error) throw error;

      // Send email notification to user when appointment is approved
      if (appointment && appointment.user_profile) {
        const formattedDate = format(new Date(appointment.appointment_date), "MMMM d, yyyy");
        const formattedTime = formatTime(appointment.start_time);
        const providerName = providerUserProfile?.full_name || "Your provider";

        let notificationType = "";
        let title = "";
        let message = "";

        switch (status) {
          case "approved":
            notificationType = "booking_confirmed";
            title = "Appointment Confirmed!";
            message = `Your appointment with ${providerName} on ${formattedDate} at ${formattedTime} has been confirmed. Please arrive on time.`;
            break;
          case "rejected":
            notificationType = "booking_rejected";
            title = "Appointment Declined";
            message = `Unfortunately, your appointment request with ${providerName} on ${formattedDate} at ${formattedTime} could not be accommodated. Please try booking a different time.`;
            break;
          case "completed":
            notificationType = "booking_completed";
            title = "Appointment Completed";
            message = `Your appointment with ${providerName} on ${formattedDate} has been marked as completed. Thank you for choosing our service!`;
            break;
          case "cancelled":
            notificationType = "booking_cancelled";
            title = "Appointment Cancelled";
            message = `Your appointment with ${providerName} on ${formattedDate} at ${formattedTime} has been cancelled.${cancellation_reason ? ` Reason: ${cancellation_reason}` : ""}`;
            
            // Trigger waitlist notification for cancelled slot
            try {
              await supabase.functions.invoke("waitlist-notify", {
                body: {
                  provider_id: appointment.provider_id,
                  cancelled_date: appointment.appointment_date,
                  cancelled_start_time: appointment.start_time,
                  cancelled_end_time: appointment.end_time,
                },
              });
            } catch (waitlistError) {
              console.error("Failed to notify waitlist:", waitlistError);
            }
            break;
        }

        if (notificationType) {
          await sendNotification({
            user_id: appointment.user_id,
            title,
            message,
            type: notificationType,
            related_appointment_id: id,
            recipient_email: appointment.user_profile.email,
            recipient_name: appointment.user_profile.full_name,
            send_email: true, // Send email notification
          });
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["provider-appointments", providerId] });
      
      const statusMessages: Record<AppointmentStatus, string> = {
        approved: "Appointment approved! The patient has been notified via email.",
        rejected: "Appointment declined. The patient has been notified.",
        completed: "Appointment marked as completed.",
        cancelled: "Appointment cancelled. The patient has been notified.",
        pending: "Appointment status updated.",
      };

      toast({
        title: "Status Updated",
        description: statusMessages[variables.status],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  // Helper function to format time
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get appointments by status filter
  const getAppointmentsByStatus = (statuses: AppointmentStatus[]) => {
    return (appointmentsQuery.data || []).filter(a => statuses.includes(a.status));
  };

  // Get today's appointments
  const getTodayAppointments = () => {
    const today = new Date().toISOString().split("T")[0];
    return (appointmentsQuery.data || []).filter(
      a => a.appointment_date === today && a.status === "approved"
    );
  };

  // Get pending appointments
  const getPendingAppointments = () => {
    return getAppointmentsByStatus(["pending"]);
  };

  // Get upcoming appointments (approved, future dates)
  const getUpcomingAppointments = () => {
    const today = new Date().toISOString().split("T")[0];
    return (appointmentsQuery.data || []).filter(
      a => a.appointment_date >= today && a.status === "approved"
    );
  };

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    getTodayAppointments,
    getPendingAppointments,
    getUpcomingAppointments,
    getAppointmentsByStatus,
  };
};
