/**
 * BACKUP: Send Phone OTP Edge Function
 * 
 * This is a backup copy of the deployed edge function.
 * The actual function is deployed from: supabase/functions/send-phone-otp/index.ts
 * 
 * Purpose: Sends a 6-digit OTP to user's phone for verification
 * 
 * Request body:
 * - phone: string (phone number with country code)
 * - userId: string (user's UUID)
 * 
 * Response:
 * - success: boolean
 * - message: string
 * - demo_otp: string (only in demo mode - remove in production)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, userId } = await req.json();

    if (!phone || !userId) {
      return new Response(
        JSON.stringify({ error: "Phone number and user ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone: phone,
        phone_verification_code: otp,
        phone_verification_expires_at: expiresAt.toISOString(),
        phone_verified: false,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error storing OTP:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In production, you would send SMS via Twilio/AWS SNS/etc.
    // For now, we'll log it (in development) and return success
    console.log(`OTP for ${phone}: ${otp}`);

    // For demo purposes, we'll include the OTP in response
    // In production, remove this and send via SMS
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent",
        // Remove this in production - only for demo
        demo_otp: otp 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-phone-otp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});