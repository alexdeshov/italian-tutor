-- =============================================================================
-- 0001_init.sql
-- Date: 2026-05-17
-- Description: Initial schema for Italian Conversation Tutor.
--   Creates four enum types, five application tables (profiles, sessions,
--   messages, errors, summaries), FK indexes, RLS policies (separate per
--   operation), a trigger that auto-creates a profile on user sign-up, and a
--   private Storage bucket `audio` with per-user path policies.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE italian_level  AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE message_role   AS ENUM ('user', 'assistant');
CREATE TYPE error_type     AS ENUM ('grammar', 'lexicon', 'pronunciation', 'syntax', 'style');


-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- profiles -----------------------------------------------------------------
CREATE TABLE public.profiles (
    id              uuid           PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    name            text,
    native_language text           NOT NULL DEFAULT 'ru',
    italian_level   italian_level  NOT NULL DEFAULT 'B1',
    created_at      timestamptz    NOT NULL DEFAULT now(),
    updated_at      timestamptz    NOT NULL DEFAULT now()
);

-- sessions -----------------------------------------------------------------
CREATE TABLE public.sessions (
    id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  uuid           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    topic       text           NOT NULL,
    started_at  timestamptz    NOT NULL DEFAULT now(),
    ended_at    timestamptz,
    status      session_status NOT NULL DEFAULT 'active'
);

-- messages -----------------------------------------------------------------
CREATE TABLE public.messages (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid         NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
    role        message_role NOT NULL,
    content     text         NOT NULL,
    audio_path  text,
    created_at  timestamptz  NOT NULL DEFAULT now()
);

-- errors -------------------------------------------------------------------
CREATE TABLE public.errors (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid        NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
    original_quote  text        NOT NULL,
    correction      text        NOT NULL,
    explanation_ru  text        NOT NULL,
    error_type      error_type  NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- summaries ----------------------------------------------------------------
CREATE TABLE public.summaries (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        uuid        NOT NULL UNIQUE REFERENCES public.sessions (id) ON DELETE CASCADE,
    overall_comment   text,
    useful_vocabulary jsonb,
    level_observation text,
    created_at        timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 3. Indexes on frequently-queried FK columns
-- ---------------------------------------------------------------------------

CREATE INDEX idx_sessions_profile_id ON public.sessions (profile_id);
CREATE INDEX idx_messages_session_id ON public.messages (session_id);
CREATE INDEX idx_errors_session_id   ON public.errors   (session_id);


-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- profiles: user sees/edits only their own row ---------------------------

CREATE POLICY "profiles: select own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles: insert own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
    ON public.profiles FOR UPDATE
    USING     (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: delete own"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

-- sessions: user accesses only their own sessions ------------------------

CREATE POLICY "sessions: select own"
    ON public.sessions FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "sessions: insert own"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "sessions: update own"
    ON public.sessions FOR UPDATE
    USING     (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "sessions: delete own"
    ON public.sessions FOR DELETE
    USING (auth.uid() = profile_id);

-- messages: access via session ownership ---------------------------------

CREATE POLICY "messages: select own"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "messages: insert own"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "messages: update own"
    ON public.messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "messages: delete own"
    ON public.messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

-- errors: access via session ownership -----------------------------------

CREATE POLICY "errors: select own"
    ON public.errors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "errors: insert own"
    ON public.errors FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "errors: update own"
    ON public.errors FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "errors: delete own"
    ON public.errors FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

-- summaries: access via session ownership --------------------------------

CREATE POLICY "summaries: select own"
    ON public.summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "summaries: insert own"
    ON public.summaries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "summaries: update own"
    ON public.summaries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );

CREATE POLICY "summaries: delete own"
    ON public.summaries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_id AND s.profile_id = auth.uid()
        )
    );


-- ---------------------------------------------------------------------------
-- 5. Trigger: auto-create profile on user registration
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Prevent search_path hijacking attacks
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (new.id);
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 6. Storage: private bucket `audio` with per-user path policies
--    Path structure: {profile_id}/{session_id}/{message_id}.{webm|mp3}
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', false);

-- Users can upload only to their own folder
CREATE POLICY "audio: insert own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'audio'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

-- Users can read only their own files
CREATE POLICY "audio: select own"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'audio'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

-- Users can delete only their own files
CREATE POLICY "audio: delete own"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'audio'
        AND split_part(name, '/', 1) = auth.uid()::text
    );


-- =============================================================================
-- Verification queries — run in SQL Editor after applying this migration:
--
-- 1. Check RLS is enabled on all public tables:
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
--
-- 2. List all RLS policies:
--    SELECT tablename, policyname, cmd
--    FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, cmd;
--
-- 3. Confirm enum types exist:
--    SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;
--
-- 4. Confirm trigger exists:
--    SELECT trigger_name, event_manipulation, event_object_table
--    FROM information_schema.triggers
--    WHERE trigger_name = 'on_auth_user_created';
--
-- 5. Confirm audio bucket was created:
--    SELECT id, name, public FROM storage.buckets WHERE id = 'audio';
-- =============================================================================
