/**
 * Send Notification Edge Function
 * 
 * Creates in-app notifications and optionally sends emails via Resend.
 * Includes rate limiting and input validation.
 * 
 * Deployed location: supabase/functions/send-notification/index.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP/user

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
};

// Input validation
const validateNotificationInput = (body: Record<string, unknown>): { valid: boolean; error?: string } => {
  const { user_id, title, message, type } = body;

  if (!user_id || typeof user_id !== "string" || user_id.length !== 36) {
    return { valid: false, error: "Invalid user_id" };
  }

  if (!title || typeof title !== "string" || title.length > 200) {
    return { valid: false, error: "Invalid title (max 200 characters)" };
  }

  if (!message || typeof message !== "string" || message.length > 1000) {
    return { valid: false, error: "Invalid message (max 1000 characters)" };
  }

  const validTypes = [
    "booking_created",
    "booking_confirmed",
    "booking_rejected",
    "booking_cancelled",
    "booking_completed",
    "reminder",
    "info",
    "payment_success",
    "payment_failed",
    "payment_refunded",
    "success",
    "error",
  ];

  if (!type || !validTypes.includes(type as string)) {
    return { valid: false, error: "Invalid notification type" };
  }

  return { valid: true };
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
    // Rate limiting - use forwarded IP or a fallback
    const clientIP =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    if (!checkRateLimit(clientIP)) {
      console.warn(`Rate limit exceeded for: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateNotificationInput(body);

    if (!validation.valid) {
      console.warn(`Validation failed: ${validation.error}`);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      user_id,
      title,
      message,
      type,
      related_appointment_id,
      recipient_email,
      recipient_name,
      send_email = false,
    } = body;

    // Sanitize text inputs
    const sanitizedTitle = sanitize(title);
    const sanitizedMessage = sanitize(message);
    const sanitizedRecipientName = recipient_name ? sanitize(recipient_name) : undefined;

    // Initialize Supabase client with service role for inserting notifications
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Creating notification for user: ${user_id}, type: ${type}`);

    // Insert notification into database
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id,
      title: sanitizedTitle,
      message: sanitizedMessage,
      type,
      related_appointment_id: related_appointment_id || null,
    });

    if (insertError) {
      console.error("Error inserting notification:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create notification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Notification created successfully for user: ${user_id}`);

    // Send email if requested
    if (send_email && recipient_email) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (!resendApiKey) {
        console.warn("RESEND_API_KEY not configured, skipping email");
      } else {
        try {
          // Generate email content based on notification type
          const emailSubject = getEmailSubject(type, sanitizedTitle);
          const emailHtml = generateEmailHtml(type, sanitizedTitle, sanitizedMessage, sanitizedRecipientName);

          console.log(`Sending email to: ${recipient_email}`);

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "BookEase <notifications@resend.dev>",
              to: [recipient_email],
              subject: emailSubject,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error("Email send failed:", errorText);
          } else {
            console.log("Email sent successfully");
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Don't fail the whole request if email fails
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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

function getEmailSubject(type: string, title: string): string {
  const subjectPrefixes: Record<string, string> = {
    booking_created: "📅 New Appointment Request",
    booking_confirmed: "✅ Appointment Confirmed",
    booking_rejected: "❌ Appointment Update",
    booking_cancelled: "🚫 Appointment Cancelled",
    booking_completed: "✨ Appointment Completed",
    reminder: "⏰ Appointment Reminder",
    info: "ℹ️ BookEase Notification",
    payment_success: "💳 Payment Successful",
    payment_failed: "⚠️ Payment Failed",
    payment_refunded: "↩️ Refund Processed",
    success: "✅ Success",
    error: "⚠️ Action Required",
  };

  return `${subjectPrefixes[type] || "BookEase"} - ${title}`;
}

function generateEmailHtml(type: string, title: string, message: string, recipientName?: string): string {
  const typeColors: Record<string, string> = {
    booking_created: "#3B82F6",
    booking_confirmed: "#10B981",
    booking_rejected: "#EF4444",
    booking_cancelled: "#F59E0B",
    booking_completed: "#8B5CF6",
    reminder: "#06B6D4",
    info: "#6B7280",
    payment_success: "#10B981",
    payment_failed: "#EF4444",
    payment_refunded: "#F59E0B",
    success: "#10B981",
    error: "#EF4444",
  };

  const color = typeColors[type] || "#3B82F6";
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
          <td style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center; padding-bottom: 30px;">
                  <div style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                    📅 BookEase
                  </div>
                </td>
              </tr>
            </table>
            
            <!-- Content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom: 20px;">
                  <p style="margin: 0; font-size: 16px; color: #374151;">${greeting}</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #111827;">${title}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 30px;">
                  <p style="margin: 0; font-size: 16px; color: #4B5563; line-height: 1.6;">${message}</p>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0; font-size: 14px; color: #9CA3AF;">
                    This is an automated message from BookEase.
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
