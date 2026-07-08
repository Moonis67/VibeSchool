-- ============================================================
-- VibeSchool RAG Pipeline — Complete Supabase Migration
-- ============================================================
-- Run this ENTIRE file in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- It is safe to run multiple times (all statements use IF NOT EXISTS).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. ENABLE PGVECTOR EXTENSION
-- Required for storing and searching vector embeddings
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector
  WITH SCHEMA extensions;


-- ────────────────────────────────────────────────────────────
-- 2. PROFILES TABLE
-- Stores user profile data; auto-populated on signup
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 3. MATERIALS TABLE
-- Tracks uploaded PDF documents
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert materials' AND tablename = 'materials') THEN
    CREATE POLICY "Anyone can insert materials"
      ON public.materials FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read materials' AND tablename = 'materials') THEN
    CREATE POLICY "Anyone can read materials"
      ON public.materials FOR SELECT
      USING (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. DOCUMENT SECTIONS TABLE
-- Stores chunked text with vector embeddings for RAG retrieval
-- gte-small produces 384-dimensional vectors
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_sections (
  id           BIGSERIAL PRIMARY KEY,
  material_id  UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    extensions.vector(384),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Create an HNSW index for fast similarity search (works with any dataset size)
CREATE INDEX IF NOT EXISTS idx_document_sections_embedding
  ON public.document_sections
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert document sections' AND tablename = 'document_sections') THEN
    CREATE POLICY "Anyone can insert document sections"
      ON public.document_sections FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read document sections' AND tablename = 'document_sections') THEN
    CREATE POLICY "Anyone can read document sections"
      ON public.document_sections FOR SELECT
      USING (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. MATCH DOCUMENT SECTIONS — RPC FUNCTION
-- Called from transform-vibe to retrieve relevant chunks
-- Uses cosine similarity (1 - distance) against the query embedding
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_document_sections(
  embedding extensions.vector(384),
  match_threshold FLOAT DEFAULT 0.2,
  match_count INT DEFAULT 4,
  filter_material_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id           BIGINT,
  material_id  UUID,
  content      TEXT,
  similarity   FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    ds.material_id,
    ds.content,
    1 - (ds.embedding <=> embedding) AS similarity
  FROM public.document_sections ds
  WHERE
    (filter_material_id IS NULL OR ds.material_id = filter_material_id)
    AND 1 - (ds.embedding <=> embedding) > match_threshold
  ORDER BY ds.embedding <=> embedding
  LIMIT match_count;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. USER SESSION HISTORY TABLE
-- Stores learning analytics per session
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_session_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_topic  TEXT,
  weak_areas  TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_session_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own session history' AND tablename = 'user_session_history') THEN
    CREATE POLICY "Users can view own session history"
      ON public.user_session_history FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own session history' AND tablename = 'user_session_history') THEN
    CREATE POLICY "Users can insert own session history"
      ON public.user_session_history FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own session history' AND tablename = 'user_session_history') THEN
    CREATE POLICY "Users can update own session history"
      ON public.user_session_history FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKET FOR EDUCATIONAL MATERIALS
-- Where PDFs are uploaded before processing
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('educational-materials', 'educational-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload files to the bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public uploads to educational-materials' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow public uploads to educational-materials"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'educational-materials');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public reads from educational-materials' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow public reads from educational-materials"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'educational-materials');
  END IF;
END $$;


-- ============================================================
-- DONE! Your RAG pipeline database infrastructure is ready.
-- 
-- Next steps:
--   1. Set GROQ_API_KEY in Supabase Dashboard → Settings → Edge Functions → Secrets
--   2. Deploy edge functions: supabase functions deploy
--   3. Test by uploading a PDF on the Transform page
-- ============================================================
