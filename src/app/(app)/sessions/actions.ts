'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toTargetLanguage } from '@/lib/languages'

export async function createSession(formData: FormData) {
  const topic = (formData.get('topic') as string | null)?.trim() ?? ''

  if (!topic) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Snapshot the profile language: the session stays in it even if the profile switches later
  const { data: profile } = await supabase
    .from('profiles')
    .select('target_language')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      profile_id: user.id,
      topic,
      status: 'active',
      language: toTargetLanguage(profile?.target_language),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  redirect(`/sessions/${data.id}`)
}

export async function endSession(sessionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw new Error(error.message)

  redirect(`/sessions/${sessionId}/summary`)
}
