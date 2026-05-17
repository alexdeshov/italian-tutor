import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'
import { buttonVariants } from '@/components/ui/button'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, italian_level')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error(
      `Profile not found for user ${user.id}. ` +
        'Check that the handle_new_user trigger fired correctly in Supabase.',
    )
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-6">Профиль</h1>
        <ProfileForm
          email={user.email!}
          initialName={profile.name}
          initialLevel={profile.italian_level}
        />
      </div>

      <div className="pt-4 border-t flex flex-wrap gap-3">
        <Link href="/sessions/new" className={buttonVariants({ variant: 'outline' })}>
          Новая сессия
        </Link>
        <Link href="/sessions" className={buttonVariants({ variant: 'outline' })}>
          История
        </Link>
      </div>
    </div>
  )
}
