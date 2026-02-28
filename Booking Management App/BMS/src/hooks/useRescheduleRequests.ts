import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ProposeRescheduleInput {
  id: string;
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  reschedule_reason?: string;
}

export const useRescheduleRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Provider proposes a new time
  const proposeRescheduleMutation = useMutation({
    mutationFn: async (input: ProposeRescheduleInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get current appointment details for notification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointment, error: fetchError } = await (supabase as any)
        .from("appointments")
        .select(`
          id, user_id, provider_id, appointment_date, start_time, end_time, status,
          reschedule_requested_by, proposed_date, proposed_start_time, proposed_end_time,
          provider:provider_profiles(user_id)
        `)
        .eq("id", input.id)
        .single();

      if (fetchError) throw fetchError;

      // Update appointment with proposed time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .update({
          proposed_date: input.proposed_date,
          proposed_start_time: input.proposed_start_time,
          proposed_end_time: input.proposed_end_time,
          reschedule_reason: input.reschedule_reason || null,
          reschedule_requested_by: "provider",
        })
        .eq("id", input.id)
        .eq("provider_id", appointment.provider_id) // Defense-in-depth ownership filter
        .select("id, user_id, provider_id, appointment_date, start_time, end_time, status, proposed_date, proposed_start_time, proposed_end_time, reschedule_requested_by, reschedule_reason")
        .single();

      if (error) throw error;

      // Send notification to patient
      const { data: providerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const { data: patientProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", appointment.user_id)
        .single();

      if (patientProfile) {
        const formattedDate = format(new Date(input.proposed_date), "MMMM d, yyyy");
        const formattedTime = formatTime(input.proposed_start_time);

        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: appointment.user_id,
            title: "Reschedule Request",
            message: `${providerProfile?.full_name || "Your provider"} has requested to reschedule your appointment to ${formattedDate} at ${formattedTime}.${input.reschedule_reason ? ` Reason: ${input.reschedule_reason}` : ""} Please review and respond.`,
            type: "reschedule_request",
            related_appointment_id: input.id,
            recipient_email: patientProfile.email,
            recipient_name: patientProfile.full_name,
            send_email: true,
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-appointments"] });
      toast({
        title: "Reschedule Proposed",
        description: "The patient has been notified of your proposed time.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to propose reschedule",
        variant: "destructive",
      });
    },
  });

  // Accept a reschedule request (updates appointment to proposed time)
  const acceptRescheduleMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get appointment with proposed time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointment, error: fetchError } = await (supabase as any)
        .from("appointments")
        .select(`
          id, user_id, provider_id, reschedule_requested_by,
          proposed_date, proposed_start_time, proposed_end_time,
          provider:provider_profiles(user_id)
        `)
        .eq("id", appointmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!appointment.proposed_date) throw new Error("No reschedule proposal found");

      // Update appointment with proposed time and clear proposal fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .update({
          appointment_date: appointment.proposed_date,
          start_time: appointment.proposed_start_time,
          end_time: appointment.proposed_end_time,
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
          reschedule_requested_by: null,
          status: "approved",
        })
        .eq("id", appointmentId)
        .eq("user_id", user.id) // Defense-in-depth: only the user accepting can match
        .select("id, user_id, provider_id, appointment_date, start_time, end_time, status")
        .single();

      if (error) throw error;

      // Determine who to notify (the other party)
      const isUserAccepting = appointment.reschedule_requested_by === "provider";
      const notifyUserId = isUserAccepting ? appointment.provider.user_id : appointment.user_id;

      const { data: notifyProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", notifyUserId)
        .single();

      const { data: accepterProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      if (notifyProfile) {
        const formattedDate = format(new Date(appointment.proposed_date), "MMMM d, yyyy");
        const formattedTime = formatTime(appointment.proposed_start_time);

        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: notifyUserId,
            title: "Reschedule Accepted",
            message: `${accepterProfile?.full_name || "The other party"} has accepted the proposed reschedule. Your appointment is now confirmed for ${formattedDate} at ${formattedTime}.`,
            type: "reschedule_accepted",
            related_appointment_id: appointmentId,
            recipient_email: notifyProfile.email,
            recipient_name: notifyProfile.full_name,
            send_email: true,
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["provider-appointments"] });
      toast({
        title: "Reschedule Accepted",
        description: "The appointment has been updated to the new time.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept reschedule",
        variant: "destructive",
      });
    },
  });

  // Decline a reschedule request (clears proposal fields)
  const declineRescheduleMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get appointment details for notification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointment, error: fetchError } = await (supabase as any)
        .from("appointments")
        .select(`
          id, user_id, provider_id, reschedule_requested_by,
          provider:provider_profiles(user_id)
        `)
        .eq("id", appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Clear proposal fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .update({
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
          reschedule_requested_by: null,
        })
        .eq("id", appointmentId)
        .eq("user_id", user.id) // Defense-in-depth ownership filter
        .select("id, user_id, provider_id, appointment_date, start_time, end_time, status")
        .single();

      if (error) throw error;

      // Notify the other party
      const isUserDeclining = appointment.reschedule_requested_by === "provider";
      const notifyUserId = isUserDeclining ? appointment.provider.user_id : appointment.user_id;

      const { data: notifyProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", notifyUserId)
        .single();

      const { data: declinerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      if (notifyProfile) {
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: notifyUserId,
            title: "Reschedule Declined",
            message: `${declinerProfile?.full_name || "The other party"} has declined the reschedule request. The original appointment time remains unchanged.`,
            type: "reschedule_declined",
            related_appointment_id: appointmentId,
            recipient_email: notifyProfile.email,
            recipient_name: notifyProfile.full_name,
            send_email: true,
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["provider-appointments"] });
      toast({
        title: "Reschedule Declined",
        description: "The original appointment time remains unchanged.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline reschedule",
        variant: "destructive",
      });
    },
  });

  return {
    proposeReschedule: proposeRescheduleMutation.mutate,
    isProposing: proposeRescheduleMutation.isPending,
    acceptReschedule: acceptRescheduleMutation.mutate,
    isAccepting: acceptRescheduleMutation.isPending,
    declineReschedule: declineRescheduleMutation.mutate,
    isDeclining: declineRescheduleMutation.isPending,
  };
};

// Helper function
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};