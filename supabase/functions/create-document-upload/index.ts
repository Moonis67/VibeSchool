import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";
import { buildTempR2Key, createPresignedPutUrl, getR2UserTempUsageBytes, requiredEnv } from "../_shared/r2.ts";

// Free-tier MVP: R2 only ever holds a file transiently while it is being
// extracted + embedded. This cap covers everything currently sitting in a
// user's temp/ prefix, not a permanent storage quota.
const TEMP_STORAGE_CAP_BYTES = 50 * 1024 * 1024;
const COMPRESSION_THRESHOLD_BYTES = 3 * 1024 * 1024;
const MAX_FILE_BYTES = TEMP_STORAGE_CAP_BYTES;
const SIGNED_URL_TTL_SECONDS = 15 * 60;
const ALLOWED_FILE_TYPES: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf"]),
  txt: new Set(["text/plain"]),
  docx: new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
};

function getBearerToken(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function bytesToMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function sanitizeFileName(name: string) {
  const trimmed = name.split(/[\\/]/).pop() || "upload";
  const safe = trimmed
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return safe || "upload";
}

function getFileExtension(name: string) {
  return sanitizeFileName(name).split(".").pop()?.toLowerCase() || "";
}

function validateMetadata(fileName: string, fileType: string, fileSize: number) {
  const extension = getFileExtension(fileName);
  const allowedMimeTypes = ALLOWED_FILE_TYPES[extension];
  if (!allowedMimeTypes || !allowedMimeTypes.has(fileType.toLowerCase())) {
    return "Unsupported file type. Upload PDF, TXT, or DOCX files only.";
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return "Invalid file size.";
  }
  if (fileSize > MAX_FILE_BYTES) {
    return `Single file uploads are limited to ${bytesToMb(MAX_FILE_BYTES)} MB.`;
  }
  return "";
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse(req, { error: safeErrorMessage(405) }, 405);

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = getBearerToken(req);
    if (!token) return jsonResponse(req, { error: safeErrorMessage(401) }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse(req, { error: safeErrorMessage(401) }, 401);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonResponse(req, { error: safeErrorMessage(400) }, 400);

    const fileName = sanitizeFileName(String(body.file_name || ""));
    const fileType = String(body.file_type || "application/octet-stream");
    const fileSize = Number(body.file_size || 0);
    // The client decides whether it can gzip (feature-detects CompressionStream)
    // and whether it's worth it for this file size — the server just has to
    // know before signing, since the marker header must be part of the
    // presigned URL's signed headers.
    const clientWantsCompression = body.compress === true && fileSize > COMPRESSION_THRESHOLD_BYTES;
    const validationError = validateMetadata(fileName, fileType, fileSize);
    if (validationError) return jsonResponse(req, { error: validationError }, 415);

    const currentUsage = await getR2UserTempUsageBytes(userData.user.id);
    if (currentUsage + fileSize > TEMP_STORAGE_CAP_BYTES) {
      return jsonResponse(req, {
        error: `Temporary storage limit reached. You have ${bytesToMb(Math.max(0, TEMP_STORAGE_CAP_BYTES - currentUsage))} MB remaining while other uploads finish processing, and this file is ${bytesToMb(fileSize)} MB. Try again shortly.`,
      }, 413);
    }

    const documentId = crypto.randomUUID();
    const r2Key = buildTempR2Key(userData.user.id, documentId, fileName);
    const { error: insertError } = await supabase.from("documents").insert({
      document_id: documentId,
      user_id: userData.user.id,
      file_name: fileName,
      processing_status: "uploading",
    });
    if (insertError) throw new Error(`Document metadata insert failed: ${insertError.message}`);

    // Large lectures are gzipped client-side before upload so they take less
    // room against the temp storage cap. The compression marker has to be a
    // custom x-amz-meta-* header (not Content-Encoding) so no HTTP client in
    // the chain silently auto-decompresses it before the worker sees the
    // raw bytes to hash and gunzip itself.
    const shouldCompress = clientWantsCompression;
    const extraSignedHeaders = shouldCompress ? { "x-amz-meta-compression": "gzip" } : {};
    const uploadUrl = await createPresignedPutUrl(r2Key, fileType, SIGNED_URL_TTL_SECONDS, extraSignedHeaders);

    return jsonResponse(req, {
      document_id: documentId,
      material_id: documentId,
      upload_url: uploadUrl,
      upload_method: "PUT",
      upload_headers: {
        "Content-Type": fileType,
        ...extraSignedHeaders,
      },
      compress: shouldCompress,
      expires_in: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(500);
    console.error(`[create-document-upload] ${message}`);
    return jsonResponse(req, { error: message }, 500);
  }
});
