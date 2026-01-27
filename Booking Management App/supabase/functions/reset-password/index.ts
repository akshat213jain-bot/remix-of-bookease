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
    const { email, reset_token, new_password } = await req.json();

    if (!email || !reset_token || !new_password) {
      return new Response(
        JSON.stringify({ error: "Email, reset token, and new password are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate password length
    if (new_password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the stored verification code
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

    // Check if verification was completed
    if (!storedCode || !storedCode.startsWith("VERIFIED:")) {
      return new Response(
        JSON.stringify({ error: "Please verify your email first" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract and verify reset token
    const storedResetToken = storedCode.replace("VERIFIED:", "");
    if (reset_token !== storedResetToken) {
      return new Response(
        JSON.stringify({ error: "Invalid reset token. Please start over." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check expiration
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Reset session has expired. Please start over." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Clear the verification code
    await supabase
      .from("profiles")
      .update({
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq("user_id", profile.user_id);

    console.log(`Password reset successful for: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Password has been reset successfully"
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
