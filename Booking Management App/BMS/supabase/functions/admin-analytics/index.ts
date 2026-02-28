import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-ANALYTICS] ${step}${detailsStr}`);
};

interface AnalyticsRequest {
  action: "get_overview" | "get_booking_trends" | "get_provider_performance" | "get_time_slot_analytics";
  date_from?: string;
  date_to?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Auth error", { error: userError?.message });
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      logStep("Access denied - not admin", { userId: userData.user.id });
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AnalyticsRequest = await req.json();
    logStep(`Processing ${body.action}`, { userId: userData.user.id });

    switch (body.action) {
      case "get_overview": {
        // Get system-wide overview stats
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Parallel queries for efficiency
        const [
          totalAppointments,
          todayAppointments,
          weekAppointments,
          monthAppointments,
          totalProviders,
          activeProviders,
          totalUsers,
          completionRates,
        ] = await Promise.all([
          supabase.from("appointments").select("id", { count: "exact", head: true }),
          supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", startOfToday),
          supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", startOfWeek),
          supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
          supabase.from("provider_profiles").select("id", { count: "exact", head: true }),
          supabase.from("provider_profiles").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_approved", true),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("appointments").select("status"),
        ]);

        // Calculate completion rate
        const statusCounts = completionRates.data?.reduce((acc: Record<string, number>, apt) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        }, {}) || {};

        const total = completionRates.data?.length || 1;
        const completed = statusCounts["completed"] || 0;
        const cancelled = (statusCounts["cancelled"] || 0) + (statusCounts["rejected"] || 0);

        return new Response(JSON.stringify({
          overview: {
            totalAppointments: totalAppointments.count || 0,
            todayAppointments: todayAppointments.count || 0,
            weekAppointments: weekAppointments.count || 0,
            monthAppointments: monthAppointments.count || 0,
            totalProviders: totalProviders.count || 0,
            activeProviders: activeProviders.count || 0,
            totalUsers: totalUsers.count || 0,
            completionRate: ((completed / total) * 100).toFixed(1),
            cancellationRate: ((cancelled / total) * 100).toFixed(1),
            statusDistribution: statusCounts,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_booking_trends": {
        // Get booking trends for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: appointments } = await supabase
          .from("appointments")
          .select("id, created_at, status, appointment_date")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        // Group by date
        const dailyTrends: Record<string, { bookings: number; completed: number; cancelled: number }> = {};
        
        appointments?.forEach((apt) => {
          const date = apt.created_at.split("T")[0];
          if (!dailyTrends[date]) {
            dailyTrends[date] = { bookings: 0, completed: 0, cancelled: 0 };
          }
          dailyTrends[date].bookings++;
          if (apt.status === "completed") dailyTrends[date].completed++;
          if (apt.status === "cancelled" || apt.status === "rejected") dailyTrends[date].cancelled++;
        });

        // Convert to array for charts
        const trendsArray = Object.entries(dailyTrends).map(([date, data]) => ({
          date,
          ...data,
        }));

        // Calculate week-over-week growth
        const thisWeekTotal = trendsArray.slice(-7).reduce((sum, d) => sum + d.bookings, 0);
        const lastWeekTotal = trendsArray.slice(-14, -7).reduce((sum, d) => sum + d.bookings, 0);
        const weeklyGrowth = lastWeekTotal > 0 
          ? (((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100).toFixed(1)
          : "0";

        return new Response(JSON.stringify({
          trends: trendsArray,
          summary: {
            totalBookings: appointments?.length || 0,
            weeklyGrowth: parseFloat(weeklyGrowth),
            avgDailyBookings: (appointments?.length || 0) / 30,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_provider_performance": {
        // Get provider performance metrics
        const { data: providers } = await supabase
          .from("provider_profiles")
          .select(`
            id,
            user_id,
            profession,
            specialty,
            average_rating,
            total_reviews,
            consultation_fee,
            is_active,
            is_approved
          `)
          .eq("is_approved", true);

        if (!providers || providers.length === 0) {
          return new Response(JSON.stringify({ providers: [], summary: {} }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get provider names
        const userIds = providers.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Get appointment counts per provider
        const { data: appointmentCounts } = await supabase
          .from("appointments")
          .select("provider_id, status");

        const providerStats: Record<string, { total: number; completed: number; cancelled: number; revenue: number }> = {};
        
        appointmentCounts?.forEach((apt) => {
          if (!providerStats[apt.provider_id]) {
            providerStats[apt.provider_id] = { total: 0, completed: 0, cancelled: 0, revenue: 0 };
          }
          providerStats[apt.provider_id].total++;
          if (apt.status === "completed") providerStats[apt.provider_id].completed++;
          if (apt.status === "cancelled" || apt.status === "rejected") providerStats[apt.provider_id].cancelled++;
        });

        // Get revenue data
        const { data: paidAppointments } = await supabase
          .from("appointments")
          .select("provider_id, payment_amount")
          .eq("payment_status", "paid");

        paidAppointments?.forEach((apt) => {
          if (providerStats[apt.provider_id]) {
            providerStats[apt.provider_id].revenue += apt.payment_amount || 0;
          }
        });

        // Build provider performance data
        const providerPerformance = providers.map((p) => {
          const profile = profileMap.get(p.user_id);
          const stats = providerStats[p.id] || { total: 0, completed: 0, cancelled: 0, revenue: 0 };
          
          return {
            id: p.id,
            name: profile?.full_name || "Unknown",
            email: profile?.email,
            profession: p.profession,
            specialty: p.specialty,
            rating: p.average_rating || 0,
            totalReviews: p.total_reviews || 0,
            consultationFee: p.consultation_fee,
            isActive: p.is_active,
            totalAppointments: stats.total,
            completedAppointments: stats.completed,
            cancelledAppointments: stats.cancelled,
            completionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : "0",
            totalRevenue: stats.revenue,
          };
        }).sort((a, b) => b.totalAppointments - a.totalAppointments);

        // Calculate summary
        const avgRating = providers.reduce((sum, p) => sum + (p.average_rating || 0), 0) / providers.length;
        const totalAppointmentsAll = Object.values(providerStats).reduce((sum, s) => sum + s.total, 0);
        const totalRevenueAll = Object.values(providerStats).reduce((sum, s) => sum + s.revenue, 0);

        return new Response(JSON.stringify({
          providers: providerPerformance,
          summary: {
            totalProviders: providers.length,
            activeProviders: providers.filter(p => p.is_active).length,
            avgRating: avgRating.toFixed(2),
            totalAppointments: totalAppointmentsAll,
            totalRevenue: totalRevenueAll,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_time_slot_analytics": {
        // Analyze popular time slots
        const { data: appointments } = await supabase
          .from("appointments")
          .select("start_time, appointment_date, status")
          .in("status", ["approved", "completed"]);

        // Group by hour
        const hourlyDistribution: Record<number, number> = {};
        const dayOfWeekDistribution: Record<number, number> = {};

        appointments?.forEach((apt) => {
          const hour = parseInt(apt.start_time.split(":")[0]);
          hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

          const dayOfWeek = new Date(apt.appointment_date).getDay();
          dayOfWeekDistribution[dayOfWeek] = (dayOfWeekDistribution[dayOfWeek] || 0) + 1;
        });

        // Find peak hours
        const hourlyArray = Object.entries(hourlyDistribution)
          .map(([hour, count]) => ({ hour: parseInt(hour), count }))
          .sort((a, b) => b.count - a.count);

        const peakHours = hourlyArray.slice(0, 3).map(h => h.hour);

        // Day names
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dailyArray = Object.entries(dayOfWeekDistribution)
          .map(([day, count]) => ({ day: dayNames[parseInt(day)], dayIndex: parseInt(day), count }))
          .sort((a, b) => a.dayIndex - b.dayIndex);

        return new Response(JSON.stringify({
          hourlyDistribution: hourlyArray,
          dailyDistribution: dailyArray,
          peakHours,
          busiestDay: dailyArray.sort((a, b) => b.count - a.count)[0]?.day || "N/A",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    logStep("Error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
