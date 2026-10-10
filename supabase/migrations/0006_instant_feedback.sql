-- =============================================================================
-- 0006_instant_feedback.sql
-- Date: 2026-10-10
-- Description: Optional instant feedback — after each learner turn the bot voices
--   the corrected phrase + a short Russian note, then replies as usual.
--   - profiles.instant_feedback: the user's setting (off by default).
--   - sessions.instant_feedback: snapshot at session creation, like `language`.
--   - messages.correction / correction_note: stored on the ASSISTANT message that
--     follows the corrected user turn (null when there was nothing to correct).
--   All columns have defaults / are nullable, so this is applied BEFORE the deploy.
--
-- Apply via Supabase SQL Editor or `supabase db query --linked -f <this file>`.
-- Verify:
--   select table_name, column_name from information_schema.columns
--   where table_schema = 'public'
--     and column_name in ('instant_feedback', 'correction', 'correction_note');  -- 4 rows
-- =============================================================================

alter table public.profiles
    add column instant_feedback boolean not null default false;

alter table public.sessions
    add column instant_feedback boolean not null default false;

alter table public.messages
    add column correction      text,
    add column correction_note text;
