import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProviderProfile, useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/hooks/useNotifications";
import { format } from "date-fns";
import { useCurrencySettings } from "@/hooks/useSystemSettings";
import { formatCurrencyValue } from "@/lib/currency";

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
  payment_status: string | null;
  payment_method: string | null;
  payment_amount: number | null;
  payment_date: string | null;
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
  const currency = useCurrencySettings();

  // Fetch provider's appointments — explicit columns, no select("*") (#5)
  const appointmentsQuery = useQuery({
    queryKey: ["provider-appointments", providerId],
    queryFn: async (): Promise<ProviderAppointment[]> => {
      if (!providerId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("id, user_id, provider_id, appointment_date, start_time, end_time, status, notes, cancellation_reason, created_at, updated_at, is_video_consultation, meeting_url, meeting_room_name, reschedule_requested_by, proposed_date, proposed_start_time, proposed_end_time, reschedule_reason, payment_status, payment_method, payment_amount, payment_date")
        .eq("provider_id", providerId)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(500);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Batch fetch user profiles
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
        .eq("id", id)
        .eq("provider_id", providerId); // Defense-in-depth ownership filter

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
            send_email: true,
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

  const getAppointmentsByStatus = (statuses: AppointmentStatus[]) => {
    return (appointmentsQuery.data || []).filter(a => statuses.includes(a.status));
  };

  const getTodayAppointments = () => {
    const today = new Date().toISOString().split("T")[0];
    return (appointmentsQuery.data || []).filter(
      a => a.appointment_date === today && a.status === "approved"
    );
  };

  const getPendingAppointments = () => {
    return getAppointmentsByStatus(["pending"]);
  };

  const getUpcomingAppointments = () => {
    const today = new Date().toISOString().split("T")[0];
    return (appointmentsQuery.data || []).filter(
      a => a.appointment_date >= today && a.status === "approved"
    );
  };

  // Fix #1: Payment updates now go through edge function (service_role) to bypass trigger
  const updatePaymentMutation = useMutation({
    mutationFn: async ({
      id,
      payment_status,
      payment_method,
      payment_amount,
    }: {
      id: string;
      payment_status: string;
      payment_method: string;
      payment_amount?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("update-payment", {
        body: {
          appointment_id: id,
          payment_status,
          payment_method,
          payment_amount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["provider-appointments", providerId] });

      toast({
        title: variables.payment_status === "paid" ? "Payment Recorded" : "Payment Status Updated",
        description: variables.payment_status === "paid"
          ? `Payment of ${variables.payment_amount ? `${formatCurrencyValue(variables.payment_amount, currency)} via ` : ""}${variables.payment_method.toUpperCase()} recorded successfully.`
          : "Payment marked as unpaid.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    updatePayment: updatePaymentMutation.mutate,
    isUpdatingPayment: updatePaymentMutation.isPending,
    getTodayAppointments,
    getPendingAppointments,
    getUpcomingAppointments,
    getAppointmentsByStatus,
  };
};
