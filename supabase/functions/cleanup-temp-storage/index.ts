// supabase/functions/cleanup-temp-storage/index.ts
// Scheduled sweep for the free-tier MVP RAG pipeline. R2 must never hold
// files longer than necessary: this removes anything left over from
// crashed uploads, stuck jobs, or failed processing runs.
//
// Not user-facing — call it from a scheduler (Supabase pg_cron + pg_net,
// or an external cron) with header `x-cleanup-secret: $CLEANUP_SECRET`.
// Example pg_cron wiring (run once in the SQL editor after setting the
// CLEANUP_SECRET function secret):
//
//   select cron.schedule(
//     'cleanup-temp-storage',
//     '*/15 * * * *',
//     $$
//     select net.http_post(
//       url := 'https://<project-ref>.functions.supabase.co/cleanup-temp-storage',
//       headers := jsonb_build_object('x-cleanup-secret', '<CLEANUP_SECRET>')
//     );
//     $$
//   );

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";
import { deleteR2Object, listR2Objects, requiredEnv } from "../_shared/r2.ts";

const STALE_TEMP_FILE_MS = 60 * 60 * 1000; // 1 hour
const STUCK_JOB_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse(req, { error: safeErrorMessage(405) }, 405);

    const cleanupSecret = requiredEnv("CLEANUP_SECRET");
    const providedSecret = req.headers.get("x-cleanup-secret") || "";
    if (providedSecret !== cleanupSecret) {
      return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Sweep every temp/ object older than 1 hour, regardless of whether a
    // matching documents row exists (catches crashes right before insert,
    // or rows that were later deleted without their R2 object being cleaned up).
    const objects = await listR2Objects("temp/");
    const now = Date.now();
    let orphanedFilesDeleted = 0;
    for (const object of objects) {
      const lastModified = Date.parse(object.lastModified);
      if (!Number.isFinite(lastModified) || now - lastModified < STALE_TEMP_FILE_MS) continue;
      await deleteR2Object(object.key);
      orphanedFilesDeleted += 1;
    }

    // 2. Rows stuck mid-pipeline for over an hour (worker crashed, never
    // claimed, etc.) — nothing useful remains, so drop the row entirely.
    const stuckCutoff = new Date(now - STUCK_JOB_MS).toISOString();
    const { data: stuckRows, error: stuckError } = await supabase
      .from("documents")
      .select("document_id")
      .in("processing_status", ["uploading", "queued", "processing"])
      .lt("created_at", stuckCutoff);
    if (stuckError) throw new Error(`Stuck job lookup failed: ${stuckError.message}`);

    let stuckRowsRemoved = 0;
    for (const row of stuckRows || []) {
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("document_id", row.document_id);
      if (!deleteError) stuckRowsRemoved += 1;
    }

    // 3. Failed uploads: the R2 file sweep above already deletes their temp
    // object once it ages past an hour, but clear it immediately too so a
    // failed upload never lingers even briefly.
    const { data: failedRows, error: failedError } = await supabase
      .from("documents")
      .select("document_id, user_id, file_name")
      .eq("processing_status", "failed");
    if (failedError) throw new Error(`Failed row lookup failed: ${failedError.message}`);

    let failedFilesDeleted = 0;
    for (const row of failedRows || []) {
      const key = `temp/${row.user_id}/${row.document_id}/${row.file_name}`;
      await deleteR2Object(key);
      failedFilesDeleted += 1;
    }

    return jsonResponse(req, {
      success: true,
      orphaned_temp_objects_deleted: orphanedFilesDeleted,
      stuck_rows_removed: stuckRowsRemoved,
      failed_upload_files_cleared: failedFilesDeleted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(500);
    console.error(`[cleanup-temp-storage] ${message}`);
    return jsonResponse(req, { error: message }, 500);
  }
});
