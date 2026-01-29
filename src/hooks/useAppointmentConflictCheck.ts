import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ConflictingAppointment {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    provider_name: string;
}

interface ConflictCheckResult {
    hasConflict: boolean;
    conflictingAppointments: ConflictingAppointment[];
}

/**
 * Hook to check for appointment conflicts before booking
 */
export const useAppointmentConflictCheck = (
    date: string | undefined,
    startTime: string | undefined,
    endTime: string | undefined
) => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["appointment-conflict", user?.id, date, startTime, endTime],
        queryFn: async (): Promise<ConflictCheckResult> => {
            if (!user?.id || !date || !startTime || !endTime) {
                return { hasConflict: false, conflictingAppointments: [] };
            }

            // Get user's existing appointments for the same date
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: appointments, error } = await (supabase as any)
                .from("appointments")
                .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          provider:provider_profiles(
            id,
            user_id
          )
        `)
                .eq("user_id", user.id)
                .eq("appointment_date", date)
                .in("status", ["pending", "approved"])
                .not("id", "is", null);

            if (error) {
                console.error("Error checking conflicts:", error);
                return { hasConflict: false, conflictingAppointments: [] };
            }

            // Check for time overlaps
            const newStart = timeToMinutes(startTime);
            const newEnd = timeToMinutes(endTime);

            const conflicts: ConflictingAppointment[] = [];

            for (const apt of appointments || []) {
                const aptStart = timeToMinutes(apt.start_time);
                const aptEnd = timeToMinutes(apt.end_time);

                // Check if times overlap
                const overlaps = newStart < aptEnd && newEnd > aptStart;

                if (overlaps) {
                    // Get provider name
                    let providerName = "Provider";
                    if (apt.provider?.user_id) {
                        const { data: profile } = await supabase
                            .from("profiles")
                            .select("full_name")
                            .eq("user_id", apt.provider.user_id)
                            .single();
                        providerName = profile?.full_name || "Provider";
                    }

                    conflicts.push({
                        id: apt.id,
                        appointment_date: apt.appointment_date,
                        start_time: apt.start_time,
                        end_time: apt.end_time,
                        provider_name: providerName,
                    });
                }
            }

            return {
                hasConflict: conflicts.length > 0,
                conflictingAppointments: conflicts,
            };
        },
        enabled: !!user?.id && !!date && !!startTime && !!endTime,
        staleTime: 30 * 1000,
    });
};

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Format time for display
 */
export const formatConflictTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

export default useAppointmentConflictCheck;
