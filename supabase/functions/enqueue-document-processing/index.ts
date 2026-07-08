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

    const { data: documentRow, error: documentError } = await supabase
      .from("documents")
      .select("document_id, processing_status")
      .eq("document_id", documentId)
      .eq("user_id", userData.user.id)
      .single();

    if (documentError || !documentRow) {
      return jsonResponse(req, { error: "Document was not found for this account." }, 404);
    }
    if (!["uploading", "uploaded", "queued", "failed"].includes(String(documentRow.processing_status))) {
      return jsonResponse(req, { error: `Document is already ${documentRow.processing_status}.` }, 409);
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        processing_status: "queued",
        uploaded_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("document_id", documentId)
      .eq("user_id", userData.user.id);

    if (updateError) throw new Error(`Document queue update failed: ${updateError.message}`);

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
