-- ============================================================
-- Security hardening: RLS and ownership policies
-- ============================================================

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_session_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_sections ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- documents
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

-- user_session_history
DROP POLICY IF EXISTS "Users can view own session history" ON public.user_session_history;
CREATE POLICY "Users can view own session history"
  ON public.user_session_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own session history" ON public.user_session_history;
CREATE POLICY "Users can insert own session history"
  ON public.user_session_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own session history" ON public.user_session_history;
CREATE POLICY "Users can update own session history"
  ON public.user_session_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own session history" ON public.user_session_history;
CREATE POLICY "Users can delete own session history"
  ON public.user_session_history FOR DELETE
  USING (auth.uid() = user_id);

-- Legacy materials table: keep private if it still exists.
DO $$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can insert materials" ON public.materials;
    DROP POLICY IF EXISTS "Anyone can read materials" ON public.materials;
    DROP POLICY IF EXISTS "Users can read own materials" ON public.materials;
    DROP POLICY IF EXISTS "Users can insert own materials" ON public.materials;
    DROP POLICY IF EXISTS "Users can update own materials" ON public.materials;
    DROP POLICY IF EXISTS "Users can delete own materials" ON public.materials;

    CREATE POLICY "Users can read own materials"
      ON public.materials FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own materials"
      ON public.materials FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own materials"
      ON public.materials FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own materials"
      ON public.materials FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Legacy document_sections table: accessible only through owned material rows.
DO $$
BEGIN
  IF to_regclass('public.document_sections') IS NOT NULL AND to_regclass('public.materials') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can insert document sections" ON public.document_sections;
    DROP POLICY IF EXISTS "Anyone can read document sections" ON public.document_sections;
    DROP POLICY IF EXISTS "Users can read own document sections" ON public.document_sections;
    DROP POLICY IF EXISTS "Users can insert own document sections" ON public.document_sections;
    DROP POLICY IF EXISTS "Users can update own document sections" ON public.document_sections;
    DROP POLICY IF EXISTS "Users can delete own document sections" ON public.document_sections;

    CREATE POLICY "Users can read own document sections"
      ON public.document_sections FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.materials m
          WHERE m.id = document_sections.material_id
            AND m.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert own document sections"
      ON public.document_sections FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.materials m
          WHERE m.id = document_sections.material_id
            AND m.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can update own document sections"
      ON public.document_sections FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.materials m
          WHERE m.id = document_sections.material_id
            AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.materials m
          WHERE m.id = document_sections.material_id
            AND m.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can delete own document sections"
      ON public.document_sections FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.materials m
          WHERE m.id = document_sections.material_id
            AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Optional chat tables if they exist in production.
DO $$
BEGIN
  IF to_regclass('public.chat_sessions') IS NOT NULL THEN
    ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can select own chat sessions" ON public.chat_sessions;
    DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.chat_sessions;
    DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
    DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;

    CREATE POLICY "Users can select own chat sessions"
      ON public.chat_sessions FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own chat sessions"
      ON public.chat_sessions FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own chat sessions"
      ON public.chat_sessions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own chat sessions"
      ON public.chat_sessions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can select own chat messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can update own chat messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'chat_messages'
        AND column_name = 'user_id'
    ) THEN
      CREATE POLICY "Users can select own chat messages"
        ON public.chat_messages FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert own chat messages"
        ON public.chat_messages FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update own chat messages"
        ON public.chat_messages FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can delete own chat messages"
        ON public.chat_messages FOR DELETE
        USING (auth.uid() = user_id);
    ELSIF to_regclass('public.chat_sessions') IS NOT NULL THEN
      CREATE POLICY "Users can select own chat messages"
        ON public.chat_messages FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.chat_sessions cs
            WHERE cs.id = chat_messages.session_id
              AND cs.user_id = auth.uid()
          )
        );

      CREATE POLICY "Users can insert own chat messages"
        ON public.chat_messages FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.chat_sessions cs
            WHERE cs.id = chat_messages.session_id
              AND cs.user_id = auth.uid()
          )
        );

      CREATE POLICY "Users can update own chat messages"
        ON public.chat_messages FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.chat_sessions cs
            WHERE cs.id = chat_messages.session_id
              AND cs.user_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.chat_sessions cs
            WHERE cs.id = chat_messages.session_id
              AND cs.user_id = auth.uid()
          )
        );

      CREATE POLICY "Users can delete own chat messages"
        ON public.chat_messages FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.chat_sessions cs
            WHERE cs.id = chat_messages.session_id
              AND cs.user_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- Avatar storage: users may manage only their own folder.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

    CREATE POLICY "Avatar public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');

    CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY "Users can update own avatar"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY "Users can delete own avatar"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
