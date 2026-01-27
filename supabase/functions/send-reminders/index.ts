import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting appointment reminder check...");

    // Get current time and calculate 24 hours from now
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);

    // Format dates for query
    const tomorrowDate = tomorrow.toISOString().split("T")[0];
    const nowDate = now.toISOString().split("T")[0];

    // Calculate time window (appointments between now+23h and now+25h)
    const startWindow = new Date(now);
    startWindow.setHours(startWindow.getHours() + 23);
    const endWindow = new Date(now);
    endWindow.setHours(endWindow.getHours() + 25);

    const startWindowTime = startWindow.toTimeString().split(" ")[0].substring(0, 5);
    const endWindowTime = endWindow.toTimeString().split(" ")[0].substring(0, 5);

    console.log(`Checking for appointments on ${tomorrowDate} or today between ${startWindowTime} and ${endWindowTime}`);

    // Query for appointments that need reminders
    // Looking for approved appointments happening in ~24 hours
    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select(`
        id,
        user_id,
        provider_id,
        appointment_date,
        start_time,
        end_time,
        status,
        notes
      `)
      .eq("status", "approved")
      .or(`appointment_date.eq.${tomorrowDate},appointment_date.eq.${nowDate}`);

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      throw fetchError;
    }

    if (!appointments || appointments.length === 0) {
      console.log("No appointments found for reminder check");
      return new Response(
        JSON.stringify({ success: true, message: "No appointments to remind", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${appointments.length} potential appointments to check`);

    // Filter appointments that are actually in the 24-hour window
    const appointmentsToRemind = appointments.filter((apt) => {
      const aptDateTime = new Date(`${apt.appointment_date}T${apt.start_time}`);
      const hoursUntil = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      // Send reminder if appointment is between 23 and 25 hours away
      return hoursUntil >= 23 && hoursUntil <= 25;
    });

    console.log(`${appointmentsToRemind.length} appointments need reminders`);

    // Check for already sent reminders (using notifications table)
    const appointmentIds = appointmentsToRemind.map((a) => a.id);
    
    const { data: existingReminders } = await supabase
      .from("notifications")
      .select("related_appointment_id")
      .in("related_appointment_id", appointmentIds)
      .eq("type", "reminder");

    const alreadyRemindedIds = new Set(
      (existingReminders || []).map((n) => n.related_appointment_id)
    );

    const newReminders = appointmentsToRemind.filter(
      (apt) => !alreadyRemindedIds.has(apt.id)
    );

    console.log(`${newReminders.length} new reminders to send`);

    if (newReminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All reminders already sent", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user and provider info for all appointments
    const userIds = [...new Set(newReminders.map((a) => a.user_id))];
    const providerIds = [...new Set(newReminders.map((a) => a.provider_id))];

    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const { data: providerProfiles } = await supabase
      .from("provider_profiles")
      .select("id, user_id, profession, location")
      .in("id", providerIds);

    const { data: providerUserProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", providerProfiles?.map((p) => p.user_id) || []);

    const userMap = new Map(userProfiles?.map((p) => [p.user_id, p]) || []);
    const providerMap = new Map(providerProfiles?.map((p) => [p.id, p]) || []);
    const providerNameMap = new Map(
      providerUserProfiles?.map((p) => [p.user_id, p.full_name]) || []
    );

    let sentCount = 0;

    // Send reminders
    for (const apt of newReminders) {
      const user = userMap.get(apt.user_id);
      const provider = providerMap.get(apt.provider_id);
      const providerName = provider ? providerNameMap.get(provider.user_id) : "Your provider";

      if (!user) {
        console.warn(`User not found for appointment ${apt.id}`);
        continue;
      }

      const formattedDate = new Date(apt.appointment_date).toLocaleDateString("en-US", {
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

      const title = "Appointment Reminder";
      const message = `Reminder: You have an appointment with ${providerName || "your provider"} tomorrow at ${formatTime(apt.start_time)}${provider?.location ? ` at ${provider.location}` : ""}. Please arrive on time.`;

      // Insert notification into database
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: apt.user_id,
        title,
        message,
        type: "reminder",
        related_appointment_id: apt.id,
      });

      if (notifError) {
        console.error(`Error creating notification for ${apt.id}:`, notifError);
        continue;
      }

      // Send email if Resend is configured
      if (resendApiKey && user.email) {
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "BookEase <notifications@resend.dev>",
              to: [user.email],
              subject: `⏰ ${title} - ${formattedDate}`,
              html: generateReminderEmail(user.full_name, providerName || "Your provider", formattedDate, formatTime(apt.start_time), provider?.location),
            }),
          });

          if (!emailResponse.ok) {
            console.error(`Email failed for ${apt.id}:`, await emailResponse.text());
          } else {
            console.log(`Email sent to ${user.email} for appointment ${apt.id}`);
          }
        } catch (emailError) {
          console.error(`Email error for ${apt.id}:`, emailError);
        }
      }

      sentCount++;
      console.log(`Reminder sent for appointment ${apt.id}`);
    }

    console.log(`Successfully sent ${sentCount} reminders`);

    return new Response(
      JSON.stringify({ success: true, message: `Sent ${sentCount} reminders`, count: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in send-reminders:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateReminderEmail(
  userName: string,
  providerName: string,
  date: string,
  time: string,
  location?: string | null
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
          <td style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center; padding-bottom: 30px;">
                  <div style="display: inline-block; background-color: #06B6D4; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                    ⏰ BookEase Reminder
                  </div>
                </td>
              </tr>
            </table>
            
            <!-- Content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom: 20px;">
                  <p style="margin: 0; font-size: 16px; color: #374151;">Hi ${userName},</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #111827;">Your Appointment is Tomorrow!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 30px;">
                  <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; border-left: 4px solid #06B6D4;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #374151;">
                      <strong>Provider:</strong> ${providerName}
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #374151;">
                      <strong>Date:</strong> ${date}
                    </p>
                    <p style="margin: 0 0 ${location ? "10px" : "0"} 0; font-size: 16px; color: #374151;">
                      <strong>Time:</strong> ${time}
                    </p>
                    ${location ? `<p style="margin: 0; font-size: 16px; color: #374151;"><strong>Location:</strong> ${location}</p>` : ""}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 30px;">
                  <p style="margin: 0; font-size: 16px; color: #4B5563; line-height: 1.6;">
                    Please make sure to arrive on time. If you need to reschedule or cancel, please do so as soon as possible.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0; font-size: 14px; color: #9CA3AF;">
                    This is an automated reminder from BookEase.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
