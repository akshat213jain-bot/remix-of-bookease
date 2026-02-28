import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Overview {
  totalAppointments: number;
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  totalProviders: number;
  activeProviders: number;
  totalUsers: number;
  completionRate: string;
  cancellationRate: string;
  statusDistribution: Record<string, number>;
}

interface TrendData {
  date: string;
  bookings: number;
  completed: number;
  cancelled: number;
}

interface BookingTrends {
  trends: TrendData[];
  summary: {
    totalBookings: number;
    weeklyGrowth: number;
    avgDailyBookings: number;
  };
}

interface ProviderPerformance {
  id: string;
  name: string;
  email: string;
  profession: string;
  specialty: string | null;
  rating: number;
  totalReviews: number;
  consultationFee: number;
  isActive: boolean;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completionRate: string;
  totalRevenue: number;
}

interface ProviderPerformanceData {
  providers: ProviderPerformance[];
  summary: {
    totalProviders: number;
    activeProviders: number;
    avgRating: string;
    totalAppointments: number;
    totalRevenue: number;
  };
}

interface TimeSlotAnalytics {
  hourlyDistribution: { hour: number; count: number }[];
  dailyDistribution: { day: string; dayIndex: number; count: number }[];
  peakHours: number[];
  busiestDay: string;
}

export const useAdminAnalytics = () => {
  const { role } = useAuth();

  const overviewQuery = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: async (): Promise<Overview> => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "get_overview" },
      });

      if (error) throw error;
      return data.overview;
    },
    enabled: role === "admin",
  });

  const bookingTrendsQuery = useQuery({
    queryKey: ["admin-analytics-trends"],
    queryFn: async (): Promise<BookingTrends> => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "get_booking_trends" },
      });

      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const providerPerformanceQuery = useQuery({
    queryKey: ["admin-analytics-provider-performance"],
    queryFn: async (): Promise<ProviderPerformanceData> => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "get_provider_performance" },
      });

      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const timeSlotAnalyticsQuery = useQuery({
    queryKey: ["admin-analytics-time-slots"],
    queryFn: async (): Promise<TimeSlotAnalytics> => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "get_time_slot_analytics" },
      });

      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  return {
    overview: overviewQuery.data,
    isLoadingOverview: overviewQuery.isLoading,
    bookingTrends: bookingTrendsQuery.data,
    isLoadingTrends: bookingTrendsQuery.isLoading,
    providerPerformance: providerPerformanceQuery.data,
    isLoadingProviderPerformance: providerPerformanceQuery.isLoading,
    timeSlotAnalytics: timeSlotAnalyticsQuery.data,
    isLoadingTimeSlots: timeSlotAnalyticsQuery.isLoading,
    isLoading:
      overviewQuery.isLoading ||
      bookingTrendsQuery.isLoading ||
      providerPerformanceQuery.isLoading ||
      timeSlotAnalyticsQuery.isLoading,
  };
};
