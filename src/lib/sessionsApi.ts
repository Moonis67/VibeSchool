// src/lib/sessionsApi.ts
// Thin client for the `sessions` edge function: named workspaces that track
// which library files are the active sources for that workspace. Nothing
// here auto-attaches a file — a file only becomes an active source when the
// user (or an explicit material_id on a transform-vibe call) adds it.
import { supabase } from "@/integrations/supabase/client";

export type VibeSession = {
  id: string;
  title: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
};

export type LibraryFile = {
  document_id: string;
  file_name: string;
  processing_status: string;
  size_bytes: number;
  created_at: string;
  is_active_in_session: boolean;
};

export type SessionSourceRow = {
  document_id: string;
  is_active: boolean;
  added_at: string;
  documents: { document_id: string; file_name: string; processing_status: string; size_bytes: number } | null;
};

async function callSessions<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");

  const { data, error } = await supabase.functions.invoke<T & { error?: string }>("sessions", {
    body: { action, ...payload },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || "Sessions request failed.");
  if (data && (data as { error?: string }).error) throw new Error((data as { error?: string }).error);
  return data as T;
}

export const listSessions = () => callSessions<{ sessions: VibeSession[] }>("list").then((res) => res.sessions);

export const createSession = (title: string, subject?: string) =>
  callSessions<{ session: VibeSession }>("create", { title, subject }).then((res) => res.session);

export const renameSession = (sessionId: string, title: string) =>
  callSessions<{ success: true }>("rename", { session_id: sessionId, title });

export const deleteSession = (sessionId: string) =>
  callSessions<{ success: true }>("delete", { session_id: sessionId });

export const openSession = (sessionId: string) =>
  callSessions<{ sources: SessionSourceRow[] }>("open", { session_id: sessionId }).then((res) => res.sources);

export const listLibrary = (sessionId?: string) =>
  callSessions<{ files: LibraryFile[] }>("library", sessionId ? { session_id: sessionId } : {}).then((res) => res.files);

export const toggleSessionSource = (sessionId: string, documentId: string, isActive: boolean) =>
  callSessions<{ success: true }>("toggle_source", { session_id: sessionId, document_id: documentId, is_active: isActive });

export const getStorageUsage = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  const { data, error } = await supabase.functions.invoke<{ used_bytes: number; cap_bytes: number }>("get-storage-usage", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error || !data) throw new Error("Could not load storage usage.");
  return { usedBytes: data.used_bytes, capBytes: data.cap_bytes };
};
