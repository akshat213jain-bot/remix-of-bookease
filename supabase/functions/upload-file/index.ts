// Upload File Edge Function
// Handle file uploads with validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
    file_name: string;
    file_type: string;
    mime_type: string;
    file_size: number;
    upload_context: string;
    appointment_id?: string;
    description?: string;
}

const MAX_FILE_SIZES: Record<string, number> = {
    booking_request: 5 * 1024 * 1024, // 5MB
    message: 5 * 1024 * 1024,
    before_service: 10 * 1024 * 1024, // 10MB
    after_service: 10 * 1024 * 1024,
    review: 10 * 1024 * 1024,
    reference: 20 * 1024 * 1024, // 20MB
};

const ALLOWED_TYPES: Record<string, string[]> = {
    image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

function logStep(step: string, details?: Record<string, unknown>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[UPLOAD-FILE] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

        const body: UploadRequest = await req.json();
        const { file_name, file_type, mime_type, file_size, upload_context, appointment_id, description } = body;

        // Validate inputs
        if (!file_name || !mime_type || !file_size || !upload_context) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate file size
        const maxSize = MAX_FILE_SIZES[upload_context] || 5 * 1024 * 1024;
        if (file_size > maxSize) {
            return new Response(
                JSON.stringify({
                    error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate mime type
        const isImage = ALLOWED_TYPES.image.includes(mime_type);
        const isDocument = ALLOWED_TYPES.document.includes(mime_type);

        if (!isImage && !isDocument) {
            return new Response(
                JSON.stringify({ error: "File type not allowed" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        logStep("Generating upload URL", { fileName: file_name, context: upload_context });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Generate unique file path
        const timestamp = Date.now();
        const sanitizedName = file_name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `uploads/${user.id}/${upload_context}/${timestamp}_${sanitizedName}`;

        // Create signed upload URL
        const { data: signedUrl, error: uploadError } = await supabaseAdmin.storage
            .from("files")
            .createSignedUploadUrl(storagePath);

        if (uploadError) {
            throw uploadError;
        }

        // Create file upload record
        const { data: fileRecord, error: recordError } = await supabaseAdmin
            .from("file_uploads")
            .insert({
                user_id: user.id,
                appointment_id: appointment_id || null,
                file_name,
                file_type: isImage ? "image" : "document",
                mime_type,
                file_size,
                storage_path: storagePath,
                upload_context,
                description,
                is_private: upload_context !== "review",
            })
            .select()
            .single();

        if (recordError) throw recordError;

        // Generate public URL (for after upload)
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/files/${storagePath}`;

        logStep("Upload URL generated", { fileId: fileRecord.id, path: storagePath });

        return new Response(
            JSON.stringify({
                success: true,
                file_id: fileRecord.id,
                upload_url: signedUrl.signedUrl,
                token: signedUrl.token,
                storage_path: storagePath,
                public_url: publicUrl,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        logStep("Error", { error: error instanceof Error ? error.message : String(error) });
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
