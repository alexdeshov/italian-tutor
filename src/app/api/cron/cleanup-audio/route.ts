export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const RETENTION_DAYS = 90
const BATCH_SIZE = 100

// Daily Vercel Cron (see vercel.json). Two jobs in one:
// 1. Deletes user recordings older than RETENTION_DAYS via the Storage API —
//    Supabase forbids deleting from storage.objects with plain SQL, which is
//    why the old pg_cron job (0003) never succeeded.
// 2. Touches the database every day so the Free-tier project is never paused
//    for inactivity.
export async function GET(request: NextRequest) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` with every cron invocation.
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: stale, error: selectError } = await supabase
    .from('messages')
    .select('id, audio_path')
    .not('audio_path', 'is', null)
    .lt('created_at', cutoff)

  if (selectError) {
    console.error('[cron/cleanup-audio] select failed:', selectError)
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  let deleted = 0
  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    const batch = stale.slice(i, i + BATCH_SIZE)

    const { error: removeError } = await supabase.storage
      .from('audio')
      .remove(batch.map((m) => m.audio_path as string))

    if (removeError) {
      console.error('[cron/cleanup-audio] storage remove failed:', removeError)
      return NextResponse.json({ error: removeError.message, deleted }, { status: 500 })
    }

    // Nullify audio_path so the summary page doesn't try to sign URLs for gone files.
    const { error: updateError } = await supabase
      .from('messages')
      .update({ audio_path: null })
      .in('id', batch.map((m) => m.id))

    if (updateError) {
      console.error('[cron/cleanup-audio] update failed:', updateError)
      return NextResponse.json({ error: updateError.message, deleted }, { status: 500 })
    }

    deleted += batch.length
  }

  console.log(`[cron/cleanup-audio] removed ${deleted} recording(s) older than ${cutoff}`)
  return NextResponse.json({ ok: true, deleted })
}
