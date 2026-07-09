// supabase/functions/get-storage-usage/index.ts
// Lets the frontend show "X / 50MB" live temp storage usage so users can
// see how close a batch upload is to the per-user R2 temp cap.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";
import { getR2UserFilesUsageBytes, requiredEnv, TEMP_STORAGE_CAP_BYTES } from "../_shared/r2.ts";

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

    const usedBytes = await getR2UserFilesUsageBytes(userData.user.id);

    return jsonResponse(req, {
      used_bytes: usedBytes,
      cap_bytes: TEMP_STORAGE_CAP_BYTES,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(500);
    console.error(`[get-storage-usage] ${message}`);
    return jsonResponse(req, { error: message }, 500);
  }
});
