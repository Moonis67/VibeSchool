-- ============================================================
-- Vibe Sessions: named workspaces that group uploaded files and
-- track which files are the "active sources" for that workspace.
--
-- A file lives in the user's global library (public.documents) once
-- uploaded, and is now kept permanently in R2 (see supabase/functions
-- /_shared/r2.ts) instead of being deleted after embedding. Attaching
-- it to a session only creates a row in session_documents; removing
-- it from a session just flips is_active, it never deletes the file.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL DEFAULT 'New Session',
  subject        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last_opened
  ON public.sessions (user_id, last_opened_at DESC);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.session_documents (
  session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(document_id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_session_documents_session
  ON public.session_documents (session_id) WHERE is_active;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own sessions" ON public.sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own session documents" ON public.session_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
