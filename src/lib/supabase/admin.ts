import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-only client with the secret key — bypasses RLS. Use only in routes that
// run without a user session (e.g. Vercel Cron). Never import from client code.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
