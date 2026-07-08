-- ============================================================
-- VibeSchool RAG Hotfix — Run this if you already ran rag_setup.sql
-- ============================================================
-- This fixes the IVFFlat index that breaks with small datasets
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Drop the broken IVFFlat index
DROP INDEX IF EXISTS idx_document_sections_embedding;

-- 2. Create an HNSW index that works with ANY number of rows
CREATE INDEX idx_document_sections_embedding
  ON public.document_sections
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. Verify: Check if document_sections has data
SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings,
  COUNT(*) - COUNT(embedding) as chunks_without_embeddings
FROM public.document_sections;

-- ============================================================
-- DONE! If total_chunks is 0, your documents were never processed.
-- Re-upload a PDF on the Transform page after deploying the 
-- updated edge functions.
-- ============================================================
