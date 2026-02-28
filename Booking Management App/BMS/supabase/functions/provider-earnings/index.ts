import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROVIDER-EARNINGS] ${step}${detailsStr}`);
};

interface EarningsRequest {
  action: "get_earnings" | "get_transactions" | "get_payouts" | "get_pending_payments";
  provider_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!stripeSecretKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify provider authentication
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

    // Get provider profile for this user
    const { data: providerProfile, error: providerError } = await supabase
      .from("provider_profiles")
      .select("id, user_id")
      .eq("user_id", userData.user.id)
      .single();

    if (providerError || !providerProfile) {
      logStep("Not a provider", { userId: userData.user.id });
      return new Response(JSON.stringify({ error: "Provider profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const body: EarningsRequest = await req.json();

    logStep(`Processing ${body.action}`, { providerId: providerProfile.id });

    switch (body.action) {
      case "get_earnings": {
        // Get all paid appointments for this provider
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Query appointments with payment data
        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select("id, payment_amount, payment_date, payment_status, status, appointment_date, created_at")
          .eq("provider_id", providerProfile.id)
          .eq("payment_status", "paid");

        if (appointmentsError) {
          throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
        }

        const calculateEarnings = (apps: typeof appointments, fromDate: Date) => {
          return (apps || [])
            .filter((a) => new Date(a.payment_date || a.created_at) >= fromDate)
            .reduce((sum, a) => sum + (a.payment_amount || 0), 0);
        };

        const countAppointments = (apps: typeof appointments, fromDate: Date) => {
          return (apps || []).filter((a) => new Date(a.payment_date || a.created_at) >= fromDate).length;
        };

        // Calculate pending earnings (approved but not completed)
        const { data: pendingAppointments } = await supabase
          .from("appointments")
          .select("id, payment_amount")
          .eq("provider_id", providerProfile.id)
          .eq("payment_status", "paid")
          .in("status", ["pending", "approved"]);

        const pendingEarnings = (pendingAppointments || []).reduce(
          (sum, a) => sum + (a.payment_amount || 0), 0
        );

        const earnings = {
          daily: {
            total: calculateEarnings(appointments, startOfDay),
            count: countAppointments(appointments, startOfDay),
          },
          weekly: {
            total: calculateEarnings(appointments, startOfWeek),
            count: countAppointments(appointments, startOfWeek),
          },
          monthly: {
            total: calculateEarnings(appointments, startOfMonth),
            count: countAppointments(appointments, startOfMonth),
          },
          yearly: {
            total: calculateEarnings(appointments, startOfYear),
            count: countAppointments(appointments, startOfYear),
          },
          allTime: {
            total: (appointments || []).reduce((sum, a) => sum + (a.payment_amount || 0), 0),
            count: (appointments || []).length,
          },
          pending: {
            total: pendingEarnings,
            count: (pendingAppointments || []).length,
          },
        };

        // Calculate monthly trends (last 6 months)
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

          const monthApps = (appointments || []).filter((a) => {
            const date = new Date(a.payment_date || a.created_at);
            return date >= monthStart && date <= monthEnd;
          });

          monthlyTrends.push({
            month: monthStart.toLocaleString('default', { month: 'short' }),
            year: monthStart.getFullYear(),
            earnings: monthApps.reduce((sum, a) => sum + (a.payment_amount || 0), 0),
            appointments: monthApps.length,
          });
        }

        logStep("Earnings calculated", { monthly: earnings.monthly.total });

        return new Response(JSON.stringify({
          earnings,
          monthlyTrends,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_transactions": {
        const limit = body.limit || 50;

        // Get recent paid appointments
        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select(`
            id, 
            appointment_date, 
            start_time, 
            payment_amount, 
            payment_date, 
            payment_status,
            status,
            stripe_payment_intent_id,
            user_id
          `)
          .eq("provider_id", providerProfile.id)
          .not("payment_status", "eq", "unpaid")
          .order("payment_date", { ascending: false, nullsFirst: false })
          .limit(limit);

        if (appointmentsError) {
          throw new Error(`Failed to fetch transactions: ${appointmentsError.message}`);
        }

        // Get user profiles for these appointments
        const userIds = [...new Set((appointments || []).map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        const transactions = (appointments || []).map(a => ({
          id: a.id,
          appointment_date: a.appointment_date,
          start_time: a.start_time,
          amount: a.payment_amount,
          payment_date: a.payment_date,
          payment_status: a.payment_status,
          appointment_status: a.status,
          patient_name: profileMap.get(a.user_id)?.full_name || "Unknown",
          patient_email: profileMap.get(a.user_id)?.email,
        }));

        logStep("Transactions fetched", { count: transactions.length });

        return new Response(JSON.stringify({ transactions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_payouts": {
        // For now, return a simplified payout structure
        // In a real implementation, this would connect to Stripe Connect
        const { data: completedAppointments } = await supabase
          .from("appointments")
          .select("id, payment_amount, payment_date, status")
          .eq("provider_id", providerProfile.id)
          .eq("payment_status", "paid")
          .eq("status", "completed")
          .order("payment_date", { ascending: false })
          .limit(body.limit || 20);

        const payouts = (completedAppointments || []).map(a => ({
          id: a.id,
          amount: a.payment_amount,
          date: a.payment_date,
          status: "completed",
        }));

        const totalPaid = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

        return new Response(JSON.stringify({
          payouts,
          summary: {
            total_paid: totalPaid,
            payout_count: payouts.length,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_pending_payments": {
        const limit = body.limit || 50;

        // Get appointments with unpaid/pending payment status
        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select(`
            id, 
            appointment_date, 
            start_time,
            end_time,
            payment_amount, 
            payment_status,
            status,
            user_id,
            is_video_consultation,
            created_at
          `)
          .eq("provider_id", providerProfile.id)
          .in("payment_status", ["unpaid", "pending"])
          .in("status", ["pending", "approved"])
          .order("appointment_date", { ascending: true })
          .limit(limit);

        if (appointmentsError) {
          throw new Error(`Failed to fetch pending payments: ${appointmentsError.message}`);
        }

        // Get user profiles for these appointments
        const userIds = [...new Set((appointments || []).map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        // Get provider's consultation fees (both physical and video)
        const { data: providerData } = await supabase
          .from("provider_profiles")
          .select("consultation_fee, video_consultation_fee")
          .eq("id", providerProfile.id)
          .single();

        const consultationFee = providerData?.consultation_fee || 0;
        const videoConsultationFee = providerData?.video_consultation_fee || consultationFee;

        const pendingPayments = (appointments || []).map(a => {
          // Use correct fee based on appointment type
          const fee = a.is_video_consultation
            ? (videoConsultationFee || consultationFee)
            : consultationFee;

          return {
            id: a.id,
            appointment_date: a.appointment_date,
            start_time: a.start_time,
            end_time: a.end_time,
            amount: a.payment_amount || fee,
            payment_status: a.payment_status,
            appointment_status: a.status,
            user_id: a.user_id,
            is_video_consultation: a.is_video_consultation || false,
            consumer_name: profileMap.get(a.user_id)?.full_name || "Unknown",
            consumer_email: profileMap.get(a.user_id)?.email || "",
            created_at: a.created_at,
          };
        });

        const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        logStep("Pending payments fetched", { count: pendingPayments.length, total: totalPending });

        return new Response(JSON.stringify({
          pendingPayments,
          summary: {
            total_pending: totalPending,
            count: pendingPayments.length,
          }
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
