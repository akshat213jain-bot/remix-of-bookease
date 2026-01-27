/**
 * Send Push Notification Edge Function
 * 
 * Sends Web Push notifications to users using their stored push subscriptions.
 * 
 * Request body:
 * - user_id: string (required) - Target user
 * - title: string (required) - Notification title
 * - body: string (required) - Notification body text
 * - url?: string (optional) - URL to open when clicked
 * - icon?: string (optional) - Icon URL
 * 
 * Deployed location: supabase/functions/send-push-notification/index.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
    console.log(`[SEND-PUSH-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : "");
};

interface PushRequest {
    user_id: string;
    title: string;
    body: string;
    url?: string;
    icon?: string;
}

interface PushSubscription {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}

// Web Push implementation using native crypto
async function sendWebPush(
    subscription: PushSubscription,
    payload: string,
    vapidPublicKey: string,
    vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
        // Create VAPID JWT header
        const vapidHeader = await createVapidAuthHeader(
            subscription.endpoint,
            vapidPublicKey,
            vapidPrivateKey
        );

        // Encrypt the payload
        const encryptedPayload = await encryptPayload(
            payload,
            subscription.p256dh,
            subscription.auth
        );

        // Send the push notification
        const response = await fetch(subscription.endpoint, {
            method: "POST",
            headers: {
                "Authorization": vapidHeader.authorization,
                "Crypto-Key": vapidHeader.cryptoKey,
                "Content-Encoding": "aes128gcm",
                "Content-Type": "application/octet-stream",
                "TTL": "86400", // 24 hours
                "Urgency": "normal",
            },
            body: encryptedPayload,
        });

        if (response.status === 201 || response.status === 200) {
            return { success: true, statusCode: response.status };
        } else if (response.status === 410 || response.status === 404) {
            // Subscription is no longer valid
            return { success: false, statusCode: response.status, error: "Subscription expired" };
        } else {
            const errorText = await response.text();
            return { success: false, statusCode: response.status, error: errorText };
        }
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

// Simplified VAPID header creation
async function createVapidAuthHeader(
    endpoint: string,
    publicKey: string,
    privateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
    const audience = new URL(endpoint).origin;
    const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

    const header = { typ: "JWT", alg: "ES256" };
    const payload = {
        aud: audience,
        exp: expiration,
        sub: "mailto:notifications@bookease.com",
    };

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import private key and sign
    const privateKeyBytes = base64UrlDecode(privateKey);
    const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyBytes,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        cryptoKey,
        new TextEncoder().encode(unsignedToken)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const jwt = `${unsignedToken}.${signatureB64}`;

    return {
        authorization: `vapid t=${jwt}, k=${publicKey}`,
        cryptoKey: `p256ecdsa=${publicKey}`,
    };
}

// Simplified payload encryption (AES-128-GCM)
async function encryptPayload(
    payload: string,
    p256dh: string,
    auth: string
): Promise<Uint8Array> {
    const payloadBytes = new TextEncoder().encode(payload);

    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Generate local key pair for ECDH
    const localKeyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
    );

    // Import the p256dh key
    const clientPublicKeyBytes = base64UrlDecode(p256dh);
    const clientPublicKey = await crypto.subtle.importKey(
        "raw",
        clientPublicKeyBytes,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: "ECDH", public: clientPublicKey },
        localKeyPair.privateKey,
        256
    );

    // Import auth secret
    const authSecretBytes = base64UrlDecode(auth);

    // Derive encryption key using HKDF
    const info = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(sharedSecret),
        "HKDF",
        false,
        ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: authSecretBytes,
            info: info,
        },
        keyMaterial,
        128
    );

    // Import as AES-GCM key
    const aesKey = await crypto.subtle.importKey(
        "raw",
        derivedBits,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    // Generate nonce
    const nonce = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt payload
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce, tagLength: 128 },
        aesKey,
        payloadBytes
    );

    // Export local public key
    const localPublicKey = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

    // Build the encrypted content (simplified format)
    const header = new Uint8Array([
        ...salt,
        0, 0, 16, 0, // Record size (4096)
        65, // Key ID length (65 bytes for uncompressed P-256)
        ...new Uint8Array(localPublicKey),
    ]);

    const result = new Uint8Array(header.length + nonce.length + encrypted.byteLength);
    result.set(header, 0);
    result.set(nonce, header.length);
    result.set(new Uint8Array(encrypted), header.length + nonce.length);

    return result;
}

function base64UrlDecode(str: string): Uint8Array {
    const padding = "=".repeat((4 - (str.length % 4)) % 4);
    const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

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
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

        if (!vapidPublicKey || !vapidPrivateKey) {
            logStep("Error: VAPID keys not configured");
            return new Response(
                JSON.stringify({
                    error: "Push notification service not configured",
                    hint: "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables are required"
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const body: PushRequest = await req.json();
        const { user_id, title, body: notificationBody, url, icon } = body;

        // Validate input
        if (!user_id || typeof user_id !== "string" || user_id.length !== 36) {
            return new Response(
                JSON.stringify({ error: "Invalid user_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!title || typeof title !== "string" || title.length > 100) {
            return new Response(
                JSON.stringify({ error: "Invalid title (required, max 100 characters)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!notificationBody || typeof notificationBody !== "string" || notificationBody.length > 500) {
            return new Response(
                JSON.stringify({ error: "Invalid body (required, max 500 characters)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Processing push notification", { userId: user_id, title });

        // Initialize Supabase admin client
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch user's push subscriptions
        const { data: subscriptions, error: fetchError } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", user_id);

        if (fetchError) {
            logStep("Error fetching subscriptions", { error: fetchError.message });
            return new Response(
                JSON.stringify({ error: "Failed to fetch push subscriptions" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!subscriptions || subscriptions.length === 0) {
            logStep("No push subscriptions found", { userId: user_id });
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "No push subscriptions found for user",
                    sent: 0
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep(`Found ${subscriptions.length} subscription(s)`, { userId: user_id });

        // Build notification payload
        const payload = JSON.stringify({
            title,
            body: notificationBody,
            icon: icon || "/icon-192.png",
            badge: "/badge.png",
            data: {
                url: url || "/",
                timestamp: Date.now(),
            },
        });

        // Send notifications to all subscriptions
        const results: Array<{ endpoint: string; success: boolean; error?: string }> = [];
        const expiredSubscriptions: string[] = [];

        for (const subscription of subscriptions) {
            const result = await sendWebPush(
                subscription as PushSubscription,
                payload,
                vapidPublicKey,
                vapidPrivateKey
            );

            results.push({
                endpoint: subscription.endpoint.substring(0, 50) + "...",
                success: result.success,
                error: result.error,
            });

            // Track expired subscriptions for cleanup
            if (result.statusCode === 410 || result.statusCode === 404) {
                expiredSubscriptions.push(subscription.id);
            }
        }

        // Clean up expired subscriptions
        if (expiredSubscriptions.length > 0) {
            logStep(`Cleaning up ${expiredSubscriptions.length} expired subscription(s)`);
            await supabase
                .from("push_subscriptions")
                .delete()
                .in("id", expiredSubscriptions);
        }

        const successCount = results.filter((r) => r.success).length;
        logStep("Push notifications sent", {
            total: results.length,
            success: successCount,
            expired: expiredSubscriptions.length
        });

        return new Response(
            JSON.stringify({
                success: successCount > 0,
                sent: successCount,
                total: results.length,
                expired_cleaned: expiredSubscriptions.length,
                details: results,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        logStep("Unexpected error", { error: (error as Error).message });
        return new Response(
            JSON.stringify({ error: (error as Error).message || "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
