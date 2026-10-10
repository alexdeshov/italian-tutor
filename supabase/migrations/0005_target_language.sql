-- =============================================================================
-- 0005_target_language.sql
-- Date: 2026-10-10
-- Description: Multi-language support (Italian + English).
--   - profiles.target_language: the language the user practices (one per profile).
--   - sessions.language: snapshot of the profile language at session creation,
--     so old sessions keep being analyzed in their own language if the profile
--     switches later.
--   Both default to 'it' — existing rows stay Italian, old code keeps working,
--   so this migration is applied BEFORE deploying the code that reads them.
--
--   Also closes the advisor warnings 0028/0029: handle_new_user() is a trigger
--   function and must not be callable via /rest/v1/rpc. Triggers don't check
--   EXECUTE at fire time, so the on_auth_user_created trigger keeps working.
--
-- Apply via Supabase SQL Editor or `supabase db query --linked -f <this file>`.
-- Verify:
--   select column_name, data_type, column_default from information_schema.columns
--   where table_schema = 'public' and column_name in ('target_language', 'language');
--   select has_function_privilege('anon', 'public.handle_new_user()', 'execute');  -- false
-- =============================================================================

create type target_language as enum ('it', 'en');

alter table public.profiles
    add column target_language target_language not null default 'it';

alter table public.sessions
    add column language target_language not null default 'it';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
