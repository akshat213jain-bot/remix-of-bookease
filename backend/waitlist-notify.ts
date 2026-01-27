/**
 * Waitlist Notify Edge Function
 * 
 * Notifies users on the waitlist when a slot becomes available:
 * - Matches available slots with waitlist preferences
 * - Sends in-app notifications
 * - Sends email notifications via Resend
 * 
 * Deployed location: supabase/functions/waitlist-notify/index.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WAITLIST-NOTIFY] ${step}${detailsStr}`);
};

interface NotifyRequest {
  provider_id: string;
  cancelled_date: string;
  cancelled_start_time: string;
  cancelled_end_time: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body: NotifyRequest = await req.json();
    logStep("Processing waitlist notification", body);

    const cancelledDate = new Date(body.cancelled_date);
    const dayOfWeek = cancelledDate.getDay();

    // Find matching waitlist entries
    const { data: waitlistEntries, error: waitlistError } = await supabase
      .from("slot_waitlist")
      .select(`
        id,
        user_id,
        preferred_date,
        preferred_day_of_week,
        preferred_start_time,
        preferred_end_time,
        is_flexible
      `)
      .eq("provider_id", body.provider_id)
      .eq("is_active", true)
      .is("notified_at", null);

    if (waitlistError) {
      throw new Error(`Failed to fetch waitlist: ${waitlistError.message}`);
    }

    logStep("Found waitlist entries", { count: waitlistEntries?.length || 0 });

    // Filter matching entries
    const matchingEntries = (waitlistEntries || []).filter((entry) => {
      // Match specific date
      if (entry.preferred_date === body.cancelled_date) return true;
      
      // Match day of week
      if (entry.preferred_day_of_week === dayOfWeek) {
        // If flexible, any time works
        if (entry.is_flexible) return true;
        
        // Check time overlap
        if (entry.preferred_start_time && entry.preferred_end_time) {
          const cancelledStart = body.cancelled_start_time;
          const cancelledEnd = body.cancelled_end_time;
          const prefStart = entry.preferred_start_time;
          const prefEnd = entry.preferred_end_time;
          
          // Check if times overlap
          return cancelledStart < prefEnd && cancelledEnd > prefStart;
        }
        return true;
      }
      
      // Flexible entries match anything
      if (entry.is_flexible) return true;
      
      return false;
    });

    logStep("Matching entries", { count: matchingEntries.length });

    if (matchingEntries.length === 0) {
      return new Response(JSON.stringify({ 
        notified: 0,
        message: "No matching waitlist entries"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get provider info
    const { data: provider } = await supabase
      .from("provider_profiles")
      .select("id, profession, user_id")
      .eq("id", body.provider_id)
      .single();

    let providerName = "Provider";
    if (provider) {
      const { data: providerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", provider.user_id)
        .single();
      providerName = providerProfile?.full_name || "Provider";
    }

    // Get user profiles for notifications
    const userIds = matchingEntries.map((e) => e.user_id);
    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const userMap = new Map((userProfiles || []).map((p) => [p.user_id, p]));

    // Format date and time
    const formattedDate = cancelledDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };

    const formattedTime = formatTime(body.cancelled_start_time);

    // Send notifications
    let notifiedCount = 0;
    const notifiedIds: string[] = [];

    for (const entry of matchingEntries) {
      const userProfile = userMap.get(entry.user_id);
      if (!userProfile) continue;

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: entry.user_id,
        title: "Slot Now Available!",
        message: `Good news! A slot with ${providerName} on ${formattedDate} at ${formattedTime} just became available. Book now before it's taken!`,
        type: "info",
      });

      // Send email if Resend is configured
      if (resendApiKey && userProfile.email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Appointments <noreply@resend.dev>",
              to: [userProfile.email],
              subject: "🎉 A slot you wanted is now available!",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Good News, ${userProfile.full_name || "there"}!</h2>
                  <p>A slot you were waiting for just became available:</p>
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Provider:</strong> ${providerName}</p>
                    <p style="margin: 8px 0 0;"><strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 8px 0 0;"><strong>Time:</strong> ${formattedTime}</p>
                  </div>
                  <p>Book now before someone else takes it!</p>
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/providers/${body.provider_id}" 
                     style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
                    Book Now
                  </a>
                </div>
              `,
            }),
          });
        } catch (emailError) {
          logStep("Email send failed", { error: String(emailError) });
        }
      }

      notifiedIds.push(entry.id);
      notifiedCount++;
    }

    // Mark entries as notified
    if (notifiedIds.length > 0) {
      await supabase
        .from("slot_waitlist")
        .update({ notified_at: new Date().toISOString() })
        .in("id", notifiedIds);
    }

    logStep("Notifications sent", { count: notifiedCount });

    return new Response(JSON.stringify({ 
      notified: notifiedCount,
      message: `Notified ${notifiedCount} users about the available slot`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("Error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
