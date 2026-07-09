// supabase/functions/sessions/index.ts
// Vibe Sessions: named workspaces that group which library files are the
// "active sources" for that workspace. A file only ever gets used by the
// AI (see transform-vibe) when it is an active source of the session the
// question was asked in — nothing here searches across sessions.

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

function clampText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\0/g, "").trim().slice(0, maxLength) : "";
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
    const userId = userData.user.id;

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonResponse(req, { error: safeErrorMessage(400) }, 400);
    const action = String(body.action || "");

    // Verifies the session belongs to this user before any read/write on it.
    async function ownedSessionOrNull(sessionId: string) {
      const { data } = await supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, title, subject, created_at, updated_at, last_opened_at")
        .eq("user_id", userId)
        .order("last_opened_at", { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);
      return jsonResponse(req, { sessions: data || [] });
    }

    if (action === "create") {
      const title = clampText(body.title, 120) || "New Session";
      const subject = clampText(body.subject, 120) || null;
      const { data, error } = await supabase
        .from("sessions")
        .insert({ user_id: userId, title, subject })
        .select("id, title, subject, created_at, updated_at, last_opened_at")
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(req, { session: data });
    }

    const sessionId = clampText(body.session_id, 100);

    if (action === "rename") {
      if (!sessionId) return jsonResponse(req, { error: "Missing session_id." }, 400);
      const title = clampText(body.title, 120);
      if (!title) return jsonResponse(req, { error: "Missing title." }, 400);
      if (!(await ownedSessionOrNull(sessionId))) return jsonResponse(req, { error: "Session not found." }, 404);

      const { error } = await supabase
        .from("sessions")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return jsonResponse(req, { success: true });
    }

    if (action === "delete") {
      if (!sessionId) return jsonResponse(req, { error: "Missing session_id." }, 400);
      if (!(await ownedSessionOrNull(sessionId))) return jsonResponse(req, { error: "Session not found." }, 404);

      // Only removes the workspace + its source links, never the underlying
      // library files (those live independently in public.documents).
      const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return jsonResponse(req, { success: true });
    }

    if (action === "open") {
      if (!sessionId) return jsonResponse(req, { error: "Missing session_id." }, 400);
      if (!(await ownedSessionOrNull(sessionId))) return jsonResponse(req, { error: "Session not found." }, 404);

      await supabase
        .from("sessions")
        .update({ last_opened_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", userId);

      const { data: sourceRows, error: sourceError } = await supabase
        .from("session_documents")
        .select("document_id, is_active, added_at, documents(document_id, file_name, processing_status, size_bytes)")
        .eq("session_id", sessionId);
      if (sourceError) throw new Error(sourceError.message);

      return jsonResponse(req, { sources: sourceRows || [] });
    }

    if (action === "library") {
      // The user's full file library, plus (when a session_id is given)
      // whether each file is currently an active source of that session —
      // lets the client render "already attached" vs "add to this session".
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("document_id, file_name, processing_status, size_bytes, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (docsError) throw new Error(docsError.message);

      let activeIds = new Set<string>();
      if (sessionId && (await ownedSessionOrNull(sessionId))) {
        const { data: activeRows } = await supabase
          .from("session_documents")
          .select("document_id")
          .eq("session_id", sessionId)
          .eq("is_active", true);
        activeIds = new Set((activeRows || []).map((row) => String(row.document_id)));
      }

      const files = (docs || []).map((doc) => ({ ...doc, is_active_in_session: activeIds.has(doc.document_id) }));
      return jsonResponse(req, { files });
    }

    if (action === "toggle_source") {
      const documentId = clampText(body.document_id, 100);
      const isActive = Boolean(body.is_active);
      if (!sessionId || !documentId) return jsonResponse(req, { error: "Missing session_id or document_id." }, 400);
      if (!(await ownedSessionOrNull(sessionId))) return jsonResponse(req, { error: "Session not found." }, 404);

      const { data: ownedDoc } = await supabase
        .from("documents")
        .select("document_id")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!ownedDoc) return jsonResponse(req, { error: "Document not found." }, 404);

      const { error } = await supabase
        .from("session_documents")
        .upsert({ session_id: sessionId, document_id: documentId, is_active: isActive }, { onConflict: "session_id,document_id" });
      if (error) throw new Error(error.message);
      return jsonResponse(req, { success: true });
    }

    return jsonResponse(req, { error: "Unknown action." }, 400);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(500);
    console.error(`[sessions] ${message}`);
    return jsonResponse(req, { error: message }, 500);
  }
});
