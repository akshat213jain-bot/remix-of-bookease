import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Brevo Webhook Receiver
 * 
 * Receives delivery status updates from Brevo (delivered, opened, bounced, etc.)
 * and stores them in the outgoing_emails table.
 * 
 * Setup in Brevo Dashboard:
 * 1. Go to Settings > Webhooks
 * 2. Add a new transactional webhook
 * 3. URL: https://<project>.supabase.co/functions/v1/brevo-webhook
 * 4. Select events: delivered, opened, hard_bounce, soft_bounce, complaint, blocked, error
 */

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
    const payload = await req.json();
    
    console.log("Brevo webhook received:", JSON.stringify(payload));

    // Brevo sends events with these fields:
    // event: "delivered" | "opened" | "click" | "hard_bounce" | "soft_bounce" | "complaint" | "blocked" | "error" | "unsubscribed"
    // message-id: the unique message ID
    // email: recipient email
    // date: when the event occurred
    // ts_event: timestamp of event
    
    const eventType = payload.event;
    const messageId = payload["message-id"];
    const recipientEmail = payload.email;
    const eventDate = payload.date || new Date().toISOString();

    if (!messageId) {
      console.warn("No message-id in webhook payload");
      return new Response(JSON.stringify({ success: true, warning: "No message-id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map Brevo events to our status
    const statusMap: Record<string, string> = {
      delivered: "delivered",
      opened: "opened",
      click: "clicked",
      hard_bounce: "bounced",
      soft_bounce: "soft_bounced",
      complaint: "complaint",
      blocked: "blocked",
      error: "error",
      unsubscribed: "unsubscribed",
      deferred: "deferred",
      sent: "sent",
    };

    const newStatus = statusMap[eventType] || eventType;

    // Update the email record
    const { error: updateError } = await supabase
      .from("outgoing_emails")
      .update({
        status: newStatus,
        last_event: eventType,
        last_event_at: eventDate,
        last_payload: payload,
      })
      .eq("message_id", messageId);

    if (updateError) {
      console.error("Failed to update email record:", updateError);
      // If record doesn't exist, try to create it
      const { error: insertError } = await supabase
        .from("outgoing_emails")
        .insert({
          message_id: messageId,
          provider: "brevo",
          to_emails: recipientEmail ? [recipientEmail] : [],
          subject: payload.subject || "Unknown",
          status: newStatus,
          last_event: eventType,
          last_event_at: eventDate,
          last_payload: payload,
        });

      if (insertError) {
        console.error("Failed to insert email record:", insertError);
      } else {
        console.log(`Created new email record for message: ${messageId}`);
      }
    } else {
      console.log(`Updated email ${messageId} with event: ${eventType}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
