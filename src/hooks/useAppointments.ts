import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type AppointmentStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

export interface Appointment {
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
  payment_amount: number | null;
  payment_status: string | null;
  payment_date: string | null;
}

export interface ProviderInfo {
  id: string;
  profession: string;
  specialty: string | null;
  consultation_fee: number | null;
  video_consultation_fee: number | null;
  location: string | null;
  user_id: string;
}

export interface AppointmentWithProvider extends Appointment {
  provider?: ProviderInfo;
  provider_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export type RecurrencePattern = "none" | "weekly" | "biweekly" | "monthly";

interface CreateAppointmentInput {
  provider_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  is_video_consultation?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_end_date?: string;
}

interface RescheduleAppointmentInput {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
}

export const useAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Subscribe to real-time updates for user's appointments
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`appointments-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Appointment update received:', payload);
          // Invalidate the appointments query to refetch
          queryClient.invalidateQueries({ queryKey: ["appointments", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Fetch user's appointments with caching
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", user?.id],
    queryFn: async (): Promise<AppointmentWithProvider[]> => {
      if (!user?.id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select(`
          id, user_id, provider_id, appointment_date, start_time, end_time,
          status, notes, cancellation_reason, created_at, updated_at,
          is_video_consultation, meeting_url, meeting_room_name,
          reschedule_requested_by, proposed_date, proposed_start_time, proposed_end_time,
          reschedule_reason, payment_amount, payment_status, payment_date,
          provider:provider_profiles(
            id,
            profession,
            specialty,
            consultation_fee,
            video_consultation_fee,
            location,
            user_id
          )
        `)
        .eq("user_id", user.id)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1000);

      if (error) throw error;

      // Fetch provider profile names
      if (data && data.length > 0) {
        const providerUserIds: string[] = [];
        data.forEach((a: AppointmentWithProvider) => {
          if (a.provider?.user_id && !providerUserIds.includes(a.provider.user_id)) {
            providerUserIds.push(a.provider.user_id);
          }
        });

        if (providerUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", providerUserIds);

          if (profiles) {
            const profileMap = new Map(profiles.map(p => [p.user_id, p]));
            data.forEach((appointment: AppointmentWithProvider) => {
              if (appointment.provider?.user_id) {
                appointment.provider_profile = profileMap.get(appointment.provider.user_id);
              }
            });
          }
        }
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  });

  // Create appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      const recurrencePattern = input.recurrence_pattern || "none";
      const isRecurring = recurrencePattern !== "none";

      // Create the parent appointment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: parentAppointment, error } = await (supabase as any)
        .from("appointments")
        .insert({
          user_id: user.id,
          provider_id: input.provider_id,
          appointment_date: input.appointment_date,
          start_time: input.start_time,
          end_time: input.end_time,
          notes: input.notes || null,
          status: "pending",
          is_video_consultation: input.is_video_consultation || false,
          recurrence_pattern: recurrencePattern,
          recurrence_end_date: input.recurrence_end_date || null,
          is_recurring_parent: isRecurring,
        })
        .select("id, user_id, provider_id, appointment_date, start_time, end_time, status, notes, is_video_consultation, recurrence_pattern, recurrence_end_date, is_recurring_parent, created_at")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("This time slot is no longer available. Please select another time.");
        }
        throw error;
      }

      // If recurring, create child appointments
      if (isRecurring && input.recurrence_end_date) {
        const childAppointments = generateRecurringDates(
          input.appointment_date,
          input.recurrence_end_date,
          recurrencePattern
        );

        if (childAppointments.length > 0) {
          const childInserts = childAppointments.map((date) => ({
            user_id: user.id,
            provider_id: input.provider_id,
            appointment_date: date,
            start_time: input.start_time,
            end_time: input.end_time,
            notes: input.notes || null,
            status: "pending",
            is_video_consultation: input.is_video_consultation || false,
            recurrence_pattern: recurrencePattern,
            parent_appointment_id: parentAppointment.id,
            is_recurring_parent: false,
          }));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: childError } = await (supabase as any).from("appointments").insert(childInserts);
          if (childError) {
            console.error("Failed to create recurring child appointments:", childError);
            // Don't throw - parent was created successfully
          }
        }
      }

      return parentAppointment;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.id] });
      const isRecurring = variables.recurrence_pattern && variables.recurrence_pattern !== "none";
      toast({
        title: isRecurring ? "Recurring appointments booked!" : "Appointment booked!",
        description: isRecurring
          ? "Your recurring appointment series has been submitted. You'll be notified once confirmed."
          : "Your appointment request has been submitted. You'll be notified once it's confirmed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Booking failed",
        description: error.message || "Failed to book appointment",
        variant: "destructive",
      });
    },
  });

  // Cancel appointment
  const cancelAppointmentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("appointments")
        .update({
          status: "cancelled",
          cancellation_reason: reason || null,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.id] });
      toast({
        title: "Appointment cancelled",
        description: "Your appointment has been cancelled.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    },
  });

  // Reschedule appointment
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async (input: RescheduleAppointmentInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get the appointment to find provider info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointment, error: fetchError } = await (supabase as any)
        .from("appointments")
        .select(`
          id, user_id, provider_id,
          provider:provider_profiles(id, user_id)
        `)
        .eq("id", input.id)
        .single();

      if (fetchError) throw fetchError;

      // Update the appointment with new date/time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .update({
          appointment_date: input.appointment_date,
          start_time: input.start_time,
          end_time: input.end_time,
          status: "pending", // Reset to pending for provider approval
        })
        .eq("id", input.id)
        .eq("user_id", user.id) // Defense-in-depth ownership filter
        .select("id, user_id, provider_id, appointment_date, start_time, end_time, status")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("This time slot is no longer available. Please select another time.");
        }
        throw error;
      }

      // Get provider's user_id to send notification
      if (appointment?.provider?.user_id) {
        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", appointment.provider.user_id)
          .single();

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();

        if (providerProfile) {
          const formattedDate = new Date(input.appointment_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          const formattedTime = formatTimeHelper(input.start_time);

          await supabase.functions.invoke("send-notification", {
            body: {
              user_id: appointment.provider.user_id,
              title: "Appointment Rescheduled",
              message: `${userProfile?.full_name || "A patient"} has rescheduled their appointment to ${formattedDate} at ${formattedTime}. Please review and confirm.`,
              type: "booking_created",
              related_appointment_id: input.id,
              recipient_email: providerProfile.email,
              recipient_name: providerProfile.full_name,
              send_email: true,
            },
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.id] });
      toast({
        title: "Appointment rescheduled!",
        description: "Your appointment has been rescheduled. The provider will confirm shortly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Reschedule failed",
        description: error.message || "Failed to reschedule appointment",
        variant: "destructive",
      });
    },
  });

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    createAppointment: createAppointmentMutation.mutate,
    createAppointmentAsync: createAppointmentMutation.mutateAsync,
    isCreating: createAppointmentMutation.isPending,
    cancelAppointment: cancelAppointmentMutation.mutate,
    isCancelling: cancelAppointmentMutation.isPending,
    rescheduleAppointment: rescheduleAppointmentMutation.mutate,
    rescheduleAppointmentAsync: rescheduleAppointmentMutation.mutateAsync,
    isRescheduling: rescheduleAppointmentMutation.isPending,
  };
};

// Helper function to format time
const formatTimeHelper = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Generate recurring appointment dates
const generateRecurringDates = (
  startDate: string,
  endDate: string,
  pattern: RecurrencePattern
): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let intervalDays: number;
  switch (pattern) {
    case "weekly":
      intervalDays = 7;
      break;
    case "biweekly":
      intervalDays = 14;
      break;
    case "monthly":
      intervalDays = 0; // Handle monthly separately
      break;
    default:
      return dates;
  }

  let current = new Date(start);

  if (pattern === "monthly") {
    // For monthly, add one month at a time
    current.setMonth(current.getMonth() + 1);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    // For weekly/biweekly
    current.setDate(current.getDate() + intervalDays);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + intervalDays);
    }
  }

  return dates;
};

// Hook to fetch available slots for a provider on a specific date
export const useAvailableSlots = (providerId: string | undefined, date: Date | undefined) => {
  return useQuery({
    queryKey: ["available-slots", providerId, date?.toISOString()],
    queryFn: async () => {
      if (!providerId || !date) return [];

      const dayOfWeek = date.getDay();
      const formattedDate = date.toISOString().split("T")[0];

      // Check if date is blocked
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: blockedDates } = await (supabase as any)
        .from("provider_blocked_dates")
        .select("id")
        .eq("provider_id", providerId)
        .eq("blocked_date", formattedDate);

      if (blockedDates && blockedDates.length > 0) {
        return []; // Date is blocked
      }

      // Get provider's availability for this day of week
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: availability } = await (supabase as any)
        .from("provider_availability")
        .select("id, provider_id, day_of_week, start_time, end_time, slot_duration, is_active")
        .eq("provider_id", providerId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .maybeSingle();

      if (!availability) {
        return []; // Provider not available on this day
      }

      // Get existing appointments for this date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingAppointments } = await (supabase as any)
        .from("appointments")
        .select("start_time, end_time")
        .eq("provider_id", providerId)
        .eq("appointment_date", formattedDate)
        .not("status", "in", '("cancelled","rejected")');

      // Generate time slots
      const slots: { start: string; end: string; available: boolean }[] = [];
      const slotDuration = availability.slot_duration;

      const startParts = availability.start_time.split(":");
      const endParts = availability.end_time.split(":");

      let currentMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      const bookedSlots = new Set(
        (existingAppointments || []).map((a: { start_time: string }) => a.start_time.substring(0, 5))
      );

      while (currentMinutes + slotDuration <= endMinutes) {
        const startHour = Math.floor(currentMinutes / 60);
        const startMin = currentMinutes % 60;
        const endHour = Math.floor((currentMinutes + slotDuration) / 60);
        const endMin = (currentMinutes + slotDuration) % 60;

        const startTime = `${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`;
        const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;

        // Check if this slot is in the past for today
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isPast = isToday && currentMinutes <= now.getHours() * 60 + now.getMinutes();

        slots.push({
          start: startTime,
          end: endTime,
          available: !bookedSlots.has(startTime) && !isPast,
        });

        currentMinutes += slotDuration;
      }

      return slots;
    },
    enabled: !!providerId && !!date,
    staleTime: 10 * 1000, // Cache for 10 seconds - slots change frequently
    refetchOnWindowFocus: true,
  });
};
