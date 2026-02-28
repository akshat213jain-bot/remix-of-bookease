/**
 * BACKUP: Verify Phone OTP Edge Function
 * 
 * This is a backup copy of the deployed edge function.
 * The actual function is deployed from: supabase/functions/verify-phone-otp/index.ts
 * 
 * Purpose: Verifies the 6-digit OTP entered by user
 * 
 * Request body:
 * - otp: string (6-digit code)
 * - userId: string (user's UUID)
 * 
 * Response:
 * - success: boolean
 * - message: string
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
    const { otp, userId } = await req.json();

    if (!otp || !userId) {
      return new Response(
        JSON.stringify({ error: "OTP and user ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get profile with OTP
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("phone_verification_code, phone_verification_expires_at")
      .eq("user_id", userId)
      .single();

    if (fetchError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if OTP matches
    if (profile.phone_verification_code !== otp) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if OTP expired
    if (new Date(profile.phone_verification_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Verification code has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark phone as verified
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating verification status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify phone" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Phone verified successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-phone-otp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});