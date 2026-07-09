import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server misconfiguration: ${name} is missing.`);
  return value;
}

function getBearerToken(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
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
    const documentId = String(body?.document_id || "");
    if (!documentId) return jsonResponse(req, { error: "Missing document_id." }, 400);

    const { data: existingRow } = await supabase
      .from("documents")
      .select("document_id, processing_status")
      .eq("document_id", documentId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!existingRow) {
      // First time we hear about this document — the client only calls this
      // once the R2 PUT has actually succeeded, so this is the earliest
      // point a row is safe to create. Nothing is ever persisted for an
      // upload that never lands.
      const fileName = sanitizeFileName(String(body?.file_name || ""));
      const fileSize = Number(body?.file_size || 0);
      if (!fileName) return jsonResponse(req, { error: "Missing file_name." }, 400);
      if (!Number.isFinite(fileSize) || fileSize <= 0) return jsonResponse(req, { error: "Missing or invalid file_size." }, 400);

      const { error: insertError } = await supabase.from("documents").insert({
        document_id: documentId,
        user_id: userData.user.id,
        file_name: fileName,
        size_bytes: fileSize,
        processing_status: "queued",
      });
      if (insertError) throw new Error(`Document metadata insert failed: ${insertError.message}`);
    } else {
      if (!["queued", "failed"].includes(String(existingRow.processing_status))) {
        return jsonResponse(req, { error: `Document is already ${existingRow.processing_status}.` }, 409);
      }
      const { error: updateError } = await supabase
        .from("documents")
        .update({ processing_status: "queued" })
        .eq("document_id", documentId)
        .eq("user_id", userData.user.id);
      if (updateError) throw new Error(`Document queue update failed: ${updateError.message}`);
    }

    return jsonResponse(req, {
      success: true,
      document_id: documentId,
      material_id: documentId,
      processing_status: "queued",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(500);
    console.error(`[enqueue-document-processing] ${message}`);
    return jsonResponse(req, { error: message }, 500);
  }
});
