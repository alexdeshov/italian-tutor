-- Drop the pg_cron audio cleanup from 0003.
-- It never worked: Supabase blocks direct DELETE on storage.objects
-- ("Direct deletion from storage tables is not allowed. Use the Storage API instead."),
-- so all runs failed. Cleanup moved to a Vercel Cron route that uses the Storage API:
-- src/app/api/cron/cleanup-audio/route.ts (schedule in vercel.json).
--
-- Apply via Supabase SQL Editor or `supabase db query --linked -f <this file>`.
-- Verify:
--   select jobname from cron.job where jobname = 'cleanup-old-audio';  -- 0 rows
--   select proname from pg_proc where proname = 'cleanup_old_audio';  -- 0 rows

select cron.unschedule('cleanup-old-audio')
where exists (select 1 from cron.job where jobname = 'cleanup-old-audio');

drop function if exists cleanup_old_audio();
