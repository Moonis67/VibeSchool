-- ============================================================
-- RAG storage update: Supabase metadata + Cloudflare R2 files + Pinecone chunks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documents (
  document_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name         TEXT NOT NULL,
  file_size         BIGINT NOT NULL CHECK (file_size >= 0),
  file_type         TEXT,
  r2_key            TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'uploaded',
  upload_context    TEXT NOT NULL DEFAULT 'standard',
  live_session_id   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_created_at
  ON public.documents (user_id, created_at DESC);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS upload_context TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS live_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_live_session_usage
  ON public.documents (user_id, upload_context, live_session_id)
  WHERE processing_status <> 'failed';

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- Legacy tables can remain for historical data, but new ingestion no longer
-- writes original files or chunk text/embeddings to Supabase.
ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can insert materials" ON public.materials;
    DROP POLICY IF EXISTS "Anyone can read materials" ON public.materials;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own materials' AND tablename = 'materials') THEN
      CREATE POLICY "Users can read own materials"
        ON public.materials FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own materials' AND tablename = 'materials') THEN
      CREATE POLICY "Users can insert own materials"
        ON public.materials FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.document_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.document_sections') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can insert document sections" ON public.document_sections;
    DROP POLICY IF EXISTS "Anyone can read document sections" ON public.document_sections;
  END IF;
END $$;
