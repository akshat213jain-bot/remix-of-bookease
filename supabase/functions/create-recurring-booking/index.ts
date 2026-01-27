// Create Recurring Booking Edge Function
// Sets up automatic recurring appointments

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateRecurringRequest {
    provider_id: string;
    service_id: string;
    frequency: "weekly" | "biweekly" | "monthly";
    day_of_week?: number; // 0-6 (Sunday-Saturday)
    day_of_month?: number; // 1-31
    time_slot: string; // HH:MM format
    start_date: string; // YYYY-MM-DD
    end_date?: string; // YYYY-MM-DD (optional)
    notes?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[CREATE-RECURRING] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Authorization required" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid authentication" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("User authenticated", { userId: user.id });

        const body: CreateRecurringRequest = await req.json();
        const {
            provider_id,
            service_id,
            frequency,
            day_of_week,
            day_of_month,
            time_slot,
            start_date,
            end_date,
            notes,
        } = body;

        // Validation
        if (!provider_id || !service_id || !frequency || !time_slot || !start_date) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (frequency === "weekly" || frequency === "biweekly") {
            if (day_of_week === undefined || day_of_week < 0 || day_of_week > 6) {
                return new Response(
                    JSON.stringify({ error: "day_of_week (0-6) required for weekly/biweekly frequency" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        if (frequency === "monthly") {
            if (!day_of_month || day_of_month < 1 || day_of_month > 31) {
                return new Response(
                    JSON.stringify({ error: "day_of_month (1-31) required for monthly frequency" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Verify service exists and get duration
        const { data: service, error: serviceError } = await supabaseAdmin
            .from("services")
            .select("id, duration, provider_id, name")
            .eq("id", service_id)
            .eq("provider_id", provider_id)
            .single();

        if (serviceError || !service) {
            return new Response(
                JSON.stringify({ error: "Service not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Calculate first appointment date
        const startDateObj = new Date(start_date);
        let firstAppointmentDate: Date;

        if (frequency === "weekly" || frequency === "biweekly") {
            // Find next occurrence of day_of_week from start_date
            const currentDow = startDateObj.getDay();
            const daysUntil = (day_of_week! - currentDow + 7) % 7 || 7;
            firstAppointmentDate = new Date(startDateObj);
            firstAppointmentDate.setDate(firstAppointmentDate.getDate() + daysUntil);
        } else {
            // Monthly - find next occurrence of day_of_month
            firstAppointmentDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), day_of_month!);
            if (firstAppointmentDate <= startDateObj) {
                firstAppointmentDate.setMonth(firstAppointmentDate.getMonth() + 1);
            }
        }

        logStep("Creating recurring booking", {
            userId: user.id,
            providerId: provider_id,
            frequency,
            firstDate: firstAppointmentDate.toISOString().split("T")[0],
        });

        // Create recurring booking
        const { data: recurring, error: createError } = await supabaseAdmin
            .from("recurring_bookings")
            .insert({
                user_id: user.id,
                provider_id,
                service_id,
                frequency,
                day_of_week: frequency !== "monthly" ? day_of_week : null,
                day_of_month: frequency === "monthly" ? day_of_month : null,
                time_slot,
                duration_minutes: service.duration || 60,
                start_date,
                end_date: end_date || null,
                next_appointment_date: firstAppointmentDate.toISOString().split("T")[0],
                notes,
            })
            .select()
            .single();

        if (createError) throw createError;

        // Generate first appointment
        const { data: appointmentId } = await supabaseAdmin.rpc("generate_recurring_appointment", {
            p_recurring_id: recurring.id,
        });

        logStep("Recurring booking created", { recurringId: recurring.id, firstAppointmentId: appointmentId });

        // Create notification
        await supabaseAdmin.from("notifications").insert({
            user_id: user.id,
            type: "recurring_setup",
            title: "Recurring Booking Created",
            message: `Your ${frequency} appointment for ${service.name} has been set up.`,
            data: { recurring_id: recurring.id },
        });

        return new Response(
            JSON.stringify({
                success: true,
                recurring_booking: recurring,
                first_appointment_id: appointmentId,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        logStep("Error", { error: error instanceof Error ? error.message : String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
