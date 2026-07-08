-- Async document ingestion for large files.
-- Files are uploaded directly to R2, then processed by an external worker.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS chunks_received INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunks_embedded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_text_chars INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documents_processing_queue
  ON public.documents (processing_status, created_at)
  WHERE processing_status IN ('uploaded', 'queued', 'processing');
