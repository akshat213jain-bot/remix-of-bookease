import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize string to prevent XSS
const sanitize = (str: string): string => {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      user_id,
      user_name,
      user_email,
      user_role,
      account_status,
      status_reason,
      subject,
      message,
    } = body;

    // Validate required fields
    if (!user_id || !user_email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize inputs
    const sanitizedSubject = sanitize(subject);
    const sanitizedMessage = sanitize(message);
    const sanitizedName = user_name ? sanitize(user_name) : "Unknown User";
    const sanitizedStatusReason = status_reason ? sanitize(status_reason) : "No reason provided";

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all admin users to notify them
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = adminUsers?.map((u) => u.user_id) || [];

    // Resolve admin recipient emails from profiles
    const adminRecipientEmails: string[] = [];
    if (adminUserIds.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("user_id", adminUserIds);

      for (const p of adminProfiles ?? []) {
        if (typeof p?.email === "string" && p.email.includes("@")) {
          adminRecipientEmails.push(p.email);
        }
      }
    }

    // Create notification for each admin
    for (const adminUserId of adminUserIds) {
      await supabase.from("notifications").insert({
        user_id: adminUserId,
        title: `Account Appeal: ${sanitizedSubject}`,
        message: `
From: ${sanitizedName} (${user_email})
Role: ${user_role || "user"}
Status: ${account_status}
Reason: ${sanitizedStatusReason}

--- Appeal Message ---
${sanitizedMessage}
        `.trim(),
        type: "info",
      });
    }

    console.log(`Created appeal notifications for ${adminUserIds.length} admin(s)`);

    // Send email via Brevo
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    let emailSent = false;

    if (brevoApiKey) {
      const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@bookease.com";
      const senderName = Deno.env.get("BREVO_SENDER_NAME") || "BookEase";

      // If no admin emails found, fall back to sender email
      if (adminRecipientEmails.length === 0) {
        console.warn("No admin recipient emails found. Falling back to BREVO_SENDER_EMAIL.");
        adminRecipientEmails.push(senderEmail);
      }

      const emailSubject = `🔔 Account Appeal: ${sanitizedSubject}`;

      const emailHtml = generateAppealEmailHtml(
        sanitizedName,
        user_email,
        user_role || "user",
        account_status,
        sanitizedStatusReason,
        sanitizedSubject,
        sanitizedMessage
      );

      const textContent = `
Account Appeal Request

From: ${sanitizedName} (${user_email})
Role: ${user_role || "user"}
Account Status: ${account_status}
Status Reason: ${sanitizedStatusReason}

Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}

---
This appeal was submitted through the BookEase app.
      `.trim();

      try {
        const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            replyTo: { name: sanitizedName, email: user_email },
            to: adminRecipientEmails.map((email) => ({ email, name: "BookEase Admin" })),
            subject: emailSubject,
            htmlContent: emailHtml,
            textContent,
            headers: { "X-Entity-Ref-ID": crypto.randomUUID() },
          }),
        });

        const responseText = await emailResponse.text();
        let messageId: string | null = null;
        try {
          const parsed = JSON.parse(responseText);
          messageId = typeof parsed?.messageId === "string" ? parsed.messageId : null;
        } catch {
          // ignore
        }

        if (emailResponse.ok) {
          emailSent = true;
          console.log("Appeal email sent successfully:", responseText);

          // Log the email for delivery tracking
          if (messageId) {
            try {
              await supabase.from("outgoing_emails").insert({
                message_id: messageId,
                provider: "brevo",
                to_emails: adminRecipientEmails,
                subject: emailSubject,
                email_type: "account_appeal",
                status: "accepted",
                sender_email: senderEmail,
                provider_response: responseText,
              });
              console.log(`Logged outgoing appeal email: ${messageId}`);
            } catch (logError) {
              console.error("Failed to log outgoing email:", logError);
            }
          }
        } else {
          console.error("Failed to send appeal email:", responseText);
        }
      } catch (emailError) {
        console.error("Error sending appeal email:", emailError);
      }
    } else {
      console.warn("BREVO_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: adminUserIds.length,
        emailSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateAppealEmailHtml(
  userName: string,
  userEmail: string,
  userRole: string,
  accountStatus: string,
  statusReason: string,
  subject: string,
  message: string
): string {
  const statusColor = accountStatus === "banned" ? "#EF4444" : "#F59E0B";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Appeal Request</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
          <td style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center; padding-bottom: 30px;">
                  <div style="display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                    🔔 Account Appeal
                  </div>
                </td>
              </tr>
            </table>
            
            <!-- User Info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 20px;">
                  <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>From:</strong> ${userName} (${userEmail})</p>
                  <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Role:</strong> ${userRole}</p>
                  <p style="margin: 0 0 8px 0; font-size: 14px;">
                    <strong>Status:</strong> 
                    <span style="color: ${statusColor}; font-weight: bold; text-transform: capitalize;">${accountStatus}</span>
                  </p>
                  <p style="margin: 0; font-size: 14px;"><strong>Reason Given:</strong> ${statusReason}</p>
                </td>
              </tr>
            </table>
            
            <!-- Appeal Content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom: 15px;">
                  <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">Subject: ${subject}</h2>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 30px; border-left: 4px solid #F59E0B; padding-left: 16px;">
                  <p style="margin: 0; font-size: 16px; color: #4B5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0; font-size: 14px; color: #9CA3AF;">
                    Reply directly to this email to respond to the user.
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
