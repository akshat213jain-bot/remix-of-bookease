import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SlotSuggestion {
    dayOfWeek: number;
    startTime: string;
    frequency: number;
    isPreferred: boolean;
}

/**
 * Hook to get smart slot suggestions based on user's booking history
 */
export const useSmartSlotSuggestions = (providerId?: string) => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["smart-slot-suggestions", user?.id, providerId],
        queryFn: async (): Promise<SlotSuggestion[]> => {
            if (!user?.id) return [];

            // Get user's past booking patterns
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: appointments, error } = await (supabase as any)
                .from("appointments")
                .select("appointment_date, start_time, end_time")
                .eq("user_id", user.id)
                .in("status", ["completed", "approved"])
                .order("appointment_date", { ascending: false })
                .limit(20);

            if (error || !appointments) return [];

            // Analyze patterns
            const timePatterns: Record<string, { count: number; dayOfWeek: number }> = {};

            appointments.forEach((apt: { appointment_date: string; start_time: string }) => {
                const date = new Date(apt.appointment_date);
                const dayOfWeek = date.getDay();
                const key = `${dayOfWeek}-${apt.start_time}`;

                if (!timePatterns[key]) {
                    timePatterns[key] = { count: 0, dayOfWeek };
                }
                timePatterns[key].count++;
            });

            // Convert to suggestions sorted by frequency
            const suggestions: SlotSuggestion[] = Object.entries(timePatterns)
                .map(([key, value]) => ({
                    dayOfWeek: value.dayOfWeek,
                    startTime: key.split("-")[1],
                    frequency: value.count,
                    isPreferred: value.count >= 2,
                }))
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 3);

            return suggestions;
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
};

/**
 * Get day name from day number
 */
export const getDayName = (dayOfWeek: number): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek] || "";
};

/**
 * Format time for display
 */
export const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

export default useSmartSlotSuggestions;
