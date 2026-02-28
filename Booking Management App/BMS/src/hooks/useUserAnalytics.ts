import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserAnalytics {
  totalBookings: number;
  totalSpent: number;
  averageBookingValue: number;
  completionRate: number;
  bookingsByMonth: { month: string; count: number }[];
  spendingByMonth: { month: string; amount: number }[];
  favoriteProviders: { name: string; count: number }[];
  bookingsByDayOfWeek: { day: string; count: number }[];
  bookingsByTimeSlot: { time: string; count: number }[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const useUserAnalytics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-analytics", user?.id],
    queryFn: async (): Promise<UserAnalytics> => {
      if (!user?.id) throw new Error("Not authenticated");

      // Fetch all user appointments
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id, appointment_date, start_time, end_time, status, payment_amount,
          provider:provider_profiles(
            profession,
            user_id
          )
        `)
        .eq("user_id", user.id)
        .order("appointment_date", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const allAppointments = appointments || [];
      const completedAppointments = allAppointments.filter(
        (a) => a.status === "completed"
      );

      // Calculate totals
      const totalBookings = allAppointments.length;
      const totalSpent = completedAppointments.reduce(
        (sum, a) => sum + (a.payment_amount || 0),
        0
      );
      const averageBookingValue =
        completedAppointments.length > 0
          ? totalSpent / completedAppointments.length
          : 0;
      const completionRate =
        totalBookings > 0
          ? (completedAppointments.length / totalBookings) * 100
          : 0;

      // Bookings by month (last 6 months)
      const bookingsByMonth: { month: string; count: number }[] = [];
      const spendingByMonth: { month: string; amount: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleString("default", { month: "short", year: "2-digit" });
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthAppointments = allAppointments.filter((a) => {
          const appDate = new Date(a.appointment_date);
          return appDate >= monthStart && appDate <= monthEnd;
        });

        const monthSpending = monthAppointments
          .filter((a) => a.status === "completed")
          .reduce((sum, a) => sum + (a.payment_amount || 0), 0);

        bookingsByMonth.push({ month: monthKey, count: monthAppointments.length });
        spendingByMonth.push({ month: monthKey, amount: monthSpending });
      }

      // Favorite providers
      const providerCounts: Record<string, number> = {};
      allAppointments.forEach((a) => {
        const providerName = a.provider?.profession || "Unknown";
        providerCounts[providerName] = (providerCounts[providerName] || 0) + 1;
      });
      const favoriteProviders = Object.entries(providerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Bookings by day of week
      const dayOfWeekCounts = DAYS.map((day) => ({ day, count: 0 }));
      allAppointments.forEach((a) => {
        const dayIndex = new Date(a.appointment_date).getDay();
        dayOfWeekCounts[dayIndex].count++;
      });

      // Bookings by time slot
      const timeSlotCounts: Record<string, number> = {};
      allAppointments.forEach((a) => {
        const hour = parseInt(a.start_time.split(":")[0], 10);
        const slot = hour < 12 ? "Morning (6-12)" : hour < 17 ? "Afternoon (12-5)" : "Evening (5-9)";
        timeSlotCounts[slot] = (timeSlotCounts[slot] || 0) + 1;
      });
      const bookingsByTimeSlot = Object.entries(timeSlotCounts).map(
        ([time, count]) => ({ time, count })
      );

      return {
        totalBookings,
        totalSpent,
        averageBookingValue,
        completionRate,
        bookingsByMonth,
        spendingByMonth,
        favoriteProviders,
        bookingsByDayOfWeek: dayOfWeekCounts,
        bookingsByTimeSlot,
      };
    },
    enabled: !!user?.id,
  });
};
