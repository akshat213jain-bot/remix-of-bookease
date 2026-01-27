import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyticsData {
  bookingTrends: { date: string; bookings: number; completed: number; cancelled: number }[];
  popularTimeSlots: { hour: number; count: number }[];
  patientDemographics: { new_patients: number; returning_patients: number };
  statusDistribution: { status: string; count: number }[];
  weekdayDistribution: { day: string; count: number }[];
  monthlyStats: { month: string; total: number; revenue: number }[];
  topPatients: { name: string; appointments: number }[];
}

function logStep(step: string, details?: unknown) {
  console.log(`[ANALYTICS] ${step}`, details ? JSON.stringify(details) : "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user and get their provider profile
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("User authenticated", { userId: user.id });

    // Get provider profile
    const { data: providerProfile, error: providerError } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (providerError || !providerProfile) {
      return new Response(
        JSON.stringify({ error: "Provider profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providerId = providerProfile.id;
    logStep("Provider found", { providerId });

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Fetch all appointments for this provider
    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("provider_id", providerId)
      .gte("created_at", sixMonthsAgo.toISOString());

    if (aptError) {
      logStep("Error fetching appointments", aptError);
      throw aptError;
    }

    logStep("Fetched appointments", { count: appointments?.length || 0 });

    // Calculate booking trends (last 30 days)
    const bookingTrends: { date: string; bookings: number; completed: number; cancelled: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const dayAppointments = (appointments || []).filter(
        (a) => a.appointment_date === dateStr
      );
      
      bookingTrends.push({
        date: dateStr,
        bookings: dayAppointments.length,
        completed: dayAppointments.filter((a) => a.status === "completed").length,
        cancelled: dayAppointments.filter((a) => a.status === "cancelled" || a.status === "rejected").length,
      });
    }

    // Popular time slots
    const timeSlotCounts: Record<number, number> = {};
    (appointments || []).forEach((apt) => {
      const hour = parseInt(apt.start_time.split(":")[0]);
      timeSlotCounts[hour] = (timeSlotCounts[hour] || 0) + 1;
    });
    
    const popularTimeSlots = Object.entries(timeSlotCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);

    // Patient demographics (new vs returning)
    const patientCounts: Record<string, number> = {};
    (appointments || []).forEach((apt) => {
      patientCounts[apt.user_id] = (patientCounts[apt.user_id] || 0) + 1;
    });
    
    const newPatients = Object.values(patientCounts).filter((count) => count === 1).length;
    const returningPatients = Object.values(patientCounts).filter((count) => count > 1).length;

    // Status distribution
    const statusCounts: Record<string, number> = {};
    (appointments || []).forEach((apt) => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
    });
    
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Weekday distribution
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    
    (appointments || []).forEach((apt) => {
      const dayOfWeek = new Date(apt.appointment_date).getDay();
      weekdayCounts[dayOfWeek] = (weekdayCounts[dayOfWeek] || 0) + 1;
    });
    
    const weekdayDistribution = weekdays.map((day, index) => ({
      day: day.substring(0, 3),
      count: weekdayCounts[index],
    }));

    // Monthly stats
    const monthlyData: Record<string, { total: number; revenue: number }> = {};
    (appointments || []).forEach((apt) => {
      const month = apt.appointment_date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { total: 0, revenue: 0 };
      }
      monthlyData[month].total += 1;
      if (apt.payment_status === "paid" && apt.payment_amount) {
        monthlyData[month].revenue += apt.payment_amount / 100; // Convert cents to dollars
      }
    });
    
    const monthlyStats = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // Top patients
    const patientAppointments: Record<string, number> = {};
    (appointments || []).forEach((apt) => {
      patientAppointments[apt.user_id] = (patientAppointments[apt.user_id] || 0) + 1;
    });
    
    const topPatientIds = Object.entries(patientAppointments)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let topPatients: { name: string; appointments: number }[] = [];
    if (topPatientIds.length > 0) {
      const { data: patientProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", topPatientIds);

      topPatients = topPatientIds.map((id) => {
        const profile = patientProfiles?.find((p) => p.user_id === id);
        return {
          name: profile?.full_name || "Unknown",
          appointments: patientAppointments[id],
        };
      });
    }

    const analyticsData: AnalyticsData = {
      bookingTrends,
      popularTimeSlots,
      patientDemographics: { new_patients: newPatients, returning_patients: returningPatients },
      statusDistribution,
      weekdayDistribution,
      monthlyStats,
      topPatients,
    };

    logStep("Analytics calculated successfully");

    return new Response(
      JSON.stringify(analyticsData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logStep("Error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
