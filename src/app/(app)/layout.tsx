import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppHeader from './app-header'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <AppHeader email={user?.email ?? ''} />
      <main>{children}</main>
    </>
  )
}
