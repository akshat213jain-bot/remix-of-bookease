import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a secure reset token
function generateResetToken(): string {
  return crypto.randomUUID() + "-" + Date.now().toString(36);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Error checking profile:", profileError);
    }

    // For security, always return success even if email doesn't exist
    // to prevent email enumeration attacks
    if (!profile) {
      console.log("No profile found for email:", normalizedEmail);
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a code has been sent" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate OTP and reset token
    const otp = generateOtp();
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP in profiles table (using existing phone verification fields temporarily)
    // In production, you might want a dedicated password_reset_codes table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone_verification_code: `PWD:${otp}:${resetToken}`,
        phone_verification_expires_at: expiresAt.toISOString(),
      })
      .eq("user_id", profile.user_id);

    if (updateError) {
      console.error("Error storing reset code:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to generate reset code" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email via Brevo
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    let emailSent = false;

    if (brevoApiKey) {
      const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@bookease.com";
      const senderName = Deno.env.get("BREVO_SENDER_NAME") || "BookEase";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Code</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <tr>
              <td style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <h1 style="margin: 0; font-size: 24px; color: #111827;">Password Reset</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 20px;">
                      <p style="margin: 0; font-size: 16px; color: #4B5563; line-height: 1.6;">
                        Hi ${profile.full_name || "there"},
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 20px;">
                      <p style="margin: 0; font-size: 16px; color: #4B5563; line-height: 1.6;">
                        We received a request to reset your password. Use the verification code below to continue:
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 30px 0;">
                      <div style="display: inline-block; background-color: #f3f4f6; padding: 20px 40px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">
                        ${otp}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 20px;">
                      <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.6; text-align: center;">
                        This code will expire in <strong>15 minutes</strong>.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 20px; border-top: 1px solid #E5E7EB;">
                      <p style="margin: 0; font-size: 14px; color: #9CA3AF; line-height: 1.6;">
                        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
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
            to: [{ email: normalizedEmail, name: profile.full_name || "User" }],
            subject: "Your Password Reset Code",
            htmlContent: emailHtml,
            textContent: `Your password reset code is: ${otp}. This code will expire in 15 minutes.`,
          }),
        });

        const responseText = await emailResponse.text();
        
        if (emailResponse.ok) {
          emailSent = true;
          console.log("Password reset email sent successfully:", responseText);

          // Log to outgoing_emails
          let messageId: string | null = null;
          try {
            const parsed = JSON.parse(responseText);
            messageId = typeof parsed?.messageId === "string" ? parsed.messageId : null;
          } catch {
            // ignore
          }

          if (messageId) {
            await supabase.from("outgoing_emails").insert({
              message_id: messageId,
              provider: "brevo",
              to_emails: [normalizedEmail],
              subject: "Your Password Reset Code",
              email_type: "password_reset",
              status: "accepted",
              sender_email: senderEmail,
              provider_response: responseText,
            });
          }
        } else {
          console.error("Failed to send password reset email:", responseText);
        }
      } catch (emailError) {
        console.error("Error sending password reset email:", emailError);
      }
    } else {
      console.warn("BREVO_API_KEY not configured");
    }

    // Return success with demo OTP for testing
    const response: Record<string, any> = {
      success: true,
      email_sent: emailSent,
      reset_token: resetToken,
    };

    // Include demo OTP for development/testing
    if (!emailSent || Deno.env.get("DEMO_MODE") === "true") {
      response.demo_otp = otp;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
