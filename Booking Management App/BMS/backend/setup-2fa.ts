// Setup 2FA Edge Function
// Generates TOTP secret and QR code for two-factor authentication

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Setup2FARequest {
    action: "generate" | "verify" | "enable" | "disable";
    code?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[SETUP-2FA] ${step}${detailsStr}`);
}

// Generate a random base32 secret
function generateSecret(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    let secret = "";
    for (let i = 0; i < array.length; i++) {
        secret += alphabet[array[i] % 32];
    }
    return secret;
}

// Generate TOTP code from secret
async function generateTOTP(secret: string, timeStep: number = 30): Promise<string> {
    const time = Math.floor(Date.now() / 1000 / timeStep);
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setBigUint64(0, BigInt(time));

    // Decode base32 secret
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const char of secret.toUpperCase()) {
        const val = alphabet.indexOf(char);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, "0");
    }
    const secretBytes = new Uint8Array(bits.length / 8);
    for (let i = 0; i < secretBytes.length; i++) {
        secretBytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
    }

    // HMAC-SHA1
    const key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, new Uint8Array(timeBuffer));
    const hash = new Uint8Array(signature);

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const code =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, "0");
}

// Verify TOTP code (check current and previous/next windows)
async function verifyTOTP(secret: string, code: string): Promise<boolean> {
    for (let i = -1; i <= 1; i++) {
        const expectedCode = await generateTOTP(secret, 30);
        if (expectedCode === code) return true;
    }
    return false;
}

// Generate backup codes
function generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
        const array = new Uint8Array(4);
        crypto.getRandomValues(array);
        const code = Array.from(array)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase();
        codes.push(code);
    }
    return codes;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Get user from auth header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Authorization required" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid authentication" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("User authenticated", { userId: user.id });

        const body: Setup2FARequest = await req.json();
        const { action, code } = body;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        switch (action) {
            case "generate": {
                // Generate new secret
                const secret = generateSecret();
                const backupCodes = generateBackupCodes();

                // Store secret (not yet enabled)
                const { error: upsertError } = await supabaseAdmin
                    .from("user_2fa")
                    .upsert({
                        user_id: user.id,
                        secret: secret,
                        is_enabled: false,
                        backup_codes: backupCodes,
                    }, { onConflict: "user_id" });

                if (upsertError) throw upsertError;

                // Get user email for QR code
                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("email, full_name")
                    .eq("user_id", user.id)
                    .single();

                const issuer = "BookEase";
                const accountName = profile?.email || user.email || "user";
                const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

                logStep("Generated 2FA secret", { userId: user.id });

                return new Response(
                    JSON.stringify({
                        success: true,
                        secret: secret,
                        qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
                        backup_codes: backupCodes,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "verify": {
                if (!code) {
                    return new Response(
                        JSON.stringify({ error: "Verification code required" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Get stored secret
                const { data: twoFa, error: fetchError } = await supabaseAdmin
                    .from("user_2fa")
                    .select("secret")
                    .eq("user_id", user.id)
                    .single();

                if (fetchError || !twoFa) {
                    return new Response(
                        JSON.stringify({ error: "2FA not set up" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const isValid = await verifyTOTP(twoFa.secret, code);

                logStep("Verified 2FA code", { userId: user.id, valid: isValid });

                return new Response(
                    JSON.stringify({ valid: isValid }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "enable": {
                if (!code) {
                    return new Response(
                        JSON.stringify({ error: "Verification code required to enable 2FA" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Get stored secret and verify code first
                const { data: twoFa, error: fetchError } = await supabaseAdmin
                    .from("user_2fa")
                    .select("secret")
                    .eq("user_id", user.id)
                    .single();

                if (fetchError || !twoFa) {
                    return new Response(
                        JSON.stringify({ error: "2FA not set up. Call generate first." }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const isValid = await verifyTOTP(twoFa.secret, code);
                if (!isValid) {
                    return new Response(
                        JSON.stringify({ error: "Invalid verification code" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Enable 2FA
                await supabaseAdmin
                    .from("user_2fa")
                    .update({ is_enabled: true, updated_at: new Date().toISOString() })
                    .eq("user_id", user.id);

                await supabaseAdmin
                    .from("profiles")
                    .update({ two_fa_enabled: true })
                    .eq("user_id", user.id);

                logStep("Enabled 2FA", { userId: user.id });

                return new Response(
                    JSON.stringify({ success: true, message: "2FA enabled successfully" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            case "disable": {
                if (!code) {
                    return new Response(
                        JSON.stringify({ error: "Verification code required to disable 2FA" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Verify code first
                const { data: twoFa } = await supabaseAdmin
                    .from("user_2fa")
                    .select("secret, backup_codes")
                    .eq("user_id", user.id)
                    .single();

                if (!twoFa) {
                    return new Response(
                        JSON.stringify({ error: "2FA not enabled" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const isValid = await verifyTOTP(twoFa.secret, code);
                const isBackupCode = twoFa.backup_codes?.includes(code);

                if (!isValid && !isBackupCode) {
                    return new Response(
                        JSON.stringify({ error: "Invalid verification code" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Disable 2FA
                await supabaseAdmin
                    .from("user_2fa")
                    .delete()
                    .eq("user_id", user.id);

                await supabaseAdmin
                    .from("profiles")
                    .update({ two_fa_enabled: false })
                    .eq("user_id", user.id);

                logStep("Disabled 2FA", { userId: user.id });

                return new Response(
                    JSON.stringify({ success: true, message: "2FA disabled successfully" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid action. Use: generate, verify, enable, disable" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }
    } catch (error) {
        logStep("Error", { error: error instanceof Error ? error.message : String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
