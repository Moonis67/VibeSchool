-- ============================================================
-- Free-tier MVP RAG pipeline: R2 is temporary staging only.
-- Original files, full extracted text, and per-user paid-tier /
-- live-session storage tiers are no longer persisted. Only
-- lightweight metadata + a pointer into Pinecone remain.
-- ============================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS chunk_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.documents
  SET chunk_count = COALESCE(chunks_embedded, 0)
  WHERE chunk_count = 0
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'chunks_embedded'
    );

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS file_size,
  DROP COLUMN IF EXISTS file_type,
  DROP COLUMN IF EXISTS r2_key,
  DROP COLUMN IF EXISTS processing_error,
  DROP COLUMN IF EXISTS chunks_received,
  DROP COLUMN IF EXISTS chunks_embedded,
  DROP COLUMN IF EXISTS total_text_chars,
  DROP COLUMN IF EXISTS page_count,
  DROP COLUMN IF EXISTS processing_attempts,
  DROP COLUMN IF EXISTS uploaded_at,
  DROP COLUMN IF EXISTS processing_started_at,
  DROP COLUMN IF EXISTS upload_context,
  DROP COLUMN IF EXISTS live_session_id;

DROP INDEX IF EXISTS idx_documents_processing_queue;
DROP INDEX IF EXISTS idx_documents_live_session_usage;

-- Used by the worker/cleanup job to find stuck uploads (queued/processing
-- for over an hour with no matching completed/failed row).
CREATE INDEX IF NOT EXISTS idx_documents_stuck_processing
  ON public.documents (processing_status, created_at)
  WHERE processing_status IN ('uploading', 'queued', 'processing');

-- Used to enforce the per-user 200 active chunk budget (oldest-first eviction).
CREATE INDEX IF NOT EXISTS idx_documents_user_processed_at
  ON public.documents (user_id, processed_at)
  WHERE processing_status = 'processed';
