-- Audio lifecycle: delete recordings older than 90 days, nullify audio_path in messages.
-- Runs daily at 03:00 UTC via pg_cron (available on all Supabase tiers).
--
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Then verify:
--   select proname from pg_proc where proname = 'cleanup_old_audio';
--   select jobname, schedule, active from cron.job where jobname = 'cleanup-old-audio';
--   select cleanup_old_audio();  -- dry-run (deletes nothing if no files are 90 days old)

create or replace function cleanup_old_audio()
returns void
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  -- Remove audio objects from storage older than 90 days
  delete from storage.objects
  where bucket_id = 'audio'
    and created_at < now() - interval '90 days';

  get diagnostics deleted_count = row_count;

  -- Nullify audio_path on messages whose audio was just removed so the
  -- summary page knows not to attempt signed-URL generation for these messages.
  update messages
  set audio_path = null
  where audio_path is not null
    and created_at < now() - interval '90 days';

  raise notice 'Cleaned up % audio file(s)', deleted_count;
end;
$$;

-- Schedule: every day at 03:00 UTC (low-traffic window)
select cron.schedule(
  'cleanup-old-audio',
  '0 3 * * *',
  $$ select cleanup_old_audio(); $$
);
