import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-PAYMENT-DATA] ${step}${detailsStr}`);
};

interface PaymentDataRequest {
  action: "list_transactions" | "get_revenue" | "refund" | "get_balance";
  limit?: number;
  starting_after?: string;
  payment_intent_id?: string;
  refund_amount?: number;
  refund_reason?: string;
  date_from?: string;
  date_to?: string;
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

    // Check if user is admin using the has_role function
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

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const body: PaymentDataRequest = await req.json();

    logStep(`Processing ${body.action}`, { userId: userData.user.id });

    switch (body.action) {
      case "list_transactions": {
        const params: Stripe.PaymentIntentListParams = {
          limit: body.limit || 50,
        };

        if (body.starting_after) {
          params.starting_after = body.starting_after;
        }

        if (body.date_from) {
          params.created = params.created || {};
          (params.created as Stripe.RangeQueryParam).gte = Math.floor(new Date(body.date_from).getTime() / 1000);
        }

        if (body.date_to) {
          params.created = params.created || {};
          (params.created as Stripe.RangeQueryParam).lte = Math.floor(new Date(body.date_to).getTime() / 1000);
        }

        const paymentIntents = await stripe.paymentIntents.list(params);
        
        // Enrich with appointment data from Supabase
        const enrichedData = await Promise.all(
          paymentIntents.data.map(async (pi: Stripe.PaymentIntent) => {
            let appointmentData = null;
            
            // Get appointment data from our database
            const { data: appointment } = await supabase
              .from("appointments")
              .select("id, appointment_date, start_time, user_id, provider_id, status, payment_status")
              .eq("stripe_payment_intent_id", pi.id)
              .limit(1)
              .single();

            if (appointment) {
              // Get user and provider names
              const { data: userProfile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("user_id", appointment.user_id)
                .single();

              const { data: providerProfile } = await supabase
                .from("provider_profiles")
                .select("user_id, profession")
                .eq("id", appointment.provider_id)
                .single();

              let providerName = null;
              if (providerProfile) {
                const { data: providerUser } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", providerProfile.user_id)
                  .single();
                providerName = providerUser?.full_name;
              }

              appointmentData = {
                ...appointment,
                user_name: userProfile?.full_name,
                user_email: userProfile?.email,
                provider_name: providerName,
                provider_profession: providerProfile?.profession,
              };
            }

            return {
              id: pi.id,
              amount: pi.amount,
              currency: pi.currency,
              status: pi.status,
              created: pi.created,
              customer_email: pi.receipt_email,
              description: pi.description,
              metadata: pi.metadata,
              appointment: appointmentData,
            };
          })
        );

        logStep("Transactions fetched", { count: enrichedData.length });

        return new Response(JSON.stringify({ 
          transactions: enrichedData,
          has_more: paymentIntents.has_more,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_revenue": {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Get successful payments for different periods
        const [dailyPayments, weeklyPayments, monthlyPayments, yearlyPayments] = await Promise.all([
          stripe.paymentIntents.list({
            created: { gte: Math.floor(startOfDay.getTime() / 1000) },
            limit: 100,
          }),
          stripe.paymentIntents.list({
            created: { gte: Math.floor(startOfWeek.getTime() / 1000) },
            limit: 100,
          }),
          stripe.paymentIntents.list({
            created: { gte: Math.floor(startOfMonth.getTime() / 1000) },
            limit: 100,
          }),
          stripe.paymentIntents.list({
            created: { gte: Math.floor(startOfYear.getTime() / 1000) },
            limit: 100,
          }),
        ]);

        const calculateTotal = (payments: Stripe.PaymentIntent[]) =>
          payments
            .filter((p) => p.status === "succeeded")
            .reduce((sum, p) => sum + p.amount, 0);

        const countSuccessful = (payments: Stripe.PaymentIntent[]) =>
          payments.filter((p) => p.status === "succeeded").length;

        const revenue = {
          daily: {
            total: calculateTotal(dailyPayments.data),
            count: countSuccessful(dailyPayments.data),
          },
          weekly: {
            total: calculateTotal(weeklyPayments.data),
            count: countSuccessful(weeklyPayments.data),
          },
          monthly: {
            total: calculateTotal(monthlyPayments.data),
            count: countSuccessful(monthlyPayments.data),
          },
          yearly: {
            total: calculateTotal(yearlyPayments.data),
            count: countSuccessful(yearlyPayments.data),
          },
        };

        logStep("Revenue calculated", { monthly: revenue.monthly.total });

        return new Response(JSON.stringify({ revenue }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_balance": {
        const balance = await stripe.balance.retrieve();

        return new Response(JSON.stringify({ 
          balance: {
            available: balance.available,
            pending: balance.pending,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "refund": {
        if (!body.payment_intent_id) {
          return new Response(JSON.stringify({ error: "payment_intent_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: body.payment_intent_id,
        };

        if (body.refund_amount) {
          refundParams.amount = body.refund_amount;
        }

        if (body.refund_reason) {
          refundParams.reason = body.refund_reason as Stripe.RefundCreateParams.Reason;
        }

        const refund = await stripe.refunds.create(refundParams);

        logStep("Refund created", { refundId: refund.id, amount: refund.amount });

        // Update appointment status in database
        const { data: appointment } = await supabase
          .from("appointments")
          .select("id, user_id")
          .eq("stripe_payment_intent_id", body.payment_intent_id)
          .single();

        if (appointment) {
          await supabase
            .from("appointments")
            .update({ payment_status: "refunded" })
            .eq("id", appointment.id);

          // Notify user
          await supabase.from("notifications").insert({
            user_id: appointment.user_id,
            title: "Refund Processed",
            message: `A refund of $${(refund.amount / 100).toFixed(2)} has been processed for your appointment.`,
            type: "info",
            related_appointment_id: appointment.id,
          });
        }

        return new Response(JSON.stringify({ 
          success: true,
          refund: {
            id: refund.id,
            amount: refund.amount,
            status: refund.status,
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
