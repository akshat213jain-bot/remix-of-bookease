import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsData {
  bookingTrends: { date: string; bookings: number; completed: number; cancelled: number }[];
  popularTimeSlots: { hour: number; count: number }[];
  patientDemographics: { new_patients: number; returning_patients: number };
  statusDistribution: { status: string; count: number }[];
  weekdayDistribution: { day: string; count: number }[];
  monthlyStats: { month: string; total: number; revenue: number }[];
  topPatients: { name: string; appointments: number }[];
}

export const useProviderAnalytics = () => {
  return useQuery({
    queryKey: ["provider-analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      const { data, error } = await supabase.functions.invoke("provider-analytics");

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
