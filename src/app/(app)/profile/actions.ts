'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const italian_level = formData.get('italian_level') as string

  const { error } = await supabase
    .from('profiles')
    .update({ name, italian_level, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/profile')
}
