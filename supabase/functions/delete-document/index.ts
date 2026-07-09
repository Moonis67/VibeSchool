// supabase/functions/delete-document/index.ts
// User-triggered document delete: removes the Pinecone vectors, the R2 temp
// object (if the file hadn't finished processing yet), and the Supabase
// metadata row. Nothing about the document should remain anywhere after this.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";
import { buildTempR2Key, buildUserFileKey, deleteR2Object, requiredEnv } from "../_shared/r2.ts";
import { deletePineconeVectorsForDocument } from "../_shared/pinecone.ts";

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
      .select("document_id, user_id, file_name, chunk_count")
      .eq("document_id", documentId)
      .eq("user_id", userData.user.id)
      .single();

    if (documentError || !documentRow) {
      return jsonResponse(req, { error: "Document was not found for this account." }, 404);
    }

    await deletePineconeVectorsForDocument(documentId, Number(documentRow.chunk_count || 0));

    // The file may be sitting in either prefix depending on how far it got
    // through the pipeline (still processing vs. fully in the library).
    await deleteR2Object(buildTempR2Key(documentRow.user_id, documentRow.document_id, documentRow.file_name));
    await deleteR2Object(buildUserFileKey(documentRow.user_id, documentRow.document_id, documentRow.file_name));

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", userData.user.id);
    if (deleteError) throw new Error(`Document metadata delete failed: ${deleteError.message}`);

    return jsonResponse(req, { success: true, document_id: documentId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(500);
    console.error(`[delete-document] ${message}`);
    return jsonResponse(req, { error: message }, 500);
  }
});
