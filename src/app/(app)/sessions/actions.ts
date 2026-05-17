'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createSession(formData: FormData) {
  const topic = (formData.get('topic') as string | null)?.trim() ?? ''

  if (!topic) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('sessions')
    .insert({ profile_id: user.id, topic, status: 'active' })
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
