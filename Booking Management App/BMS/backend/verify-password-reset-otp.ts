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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, otp, reset_token } = await req.json();

    if (!email || !otp || !reset_token) {
      return new Response(
        JSON.stringify({ error: "Email, OTP, and reset token are required" }),
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

    // Get the stored code
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, phone_verification_code, phone_verification_expires_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const storedCode = profile.phone_verification_code;
    const expiresAt = profile.phone_verification_expires_at;

    // Check if code exists and is for password reset
    if (!storedCode || !storedCode.startsWith("PWD:")) {
      return new Response(
        JSON.stringify({ error: "No password reset code found. Please request a new one." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse stored code: PWD:otp:resetToken
    const parts = storedCode.split(":");
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: "Invalid reset code format. Please request a new one." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const storedOtp = parts[1];
    const storedResetToken = parts[2];

    // Check expiration
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Verification code has expired. Please request a new one." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify OTP and reset token
    if (otp !== storedOtp) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (reset_token !== storedResetToken) {
      return new Response(
        JSON.stringify({ error: "Invalid reset token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark as verified by updating the code to include VERIFIED prefix
    await supabase
      .from("profiles")
      .update({
        phone_verification_code: `VERIFIED:${storedResetToken}`,
        phone_verification_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 more minutes to reset
      })
      .eq("user_id", profile.user_id);

    console.log(`OTP verified for password reset: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ 
        verified: true,
        message: "Email verified successfully. You can now reset your password."
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
