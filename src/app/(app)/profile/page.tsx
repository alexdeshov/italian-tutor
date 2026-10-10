import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TrendingUp, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { toTargetLanguage } from '@/lib/languages'
import { ProfileForm } from './profile-form'
import { LogoutButton } from './LogoutButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, italian_level, target_language')
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
          initialLanguage={toTargetLanguage(profile.target_language)}
        />
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/progress" className="block">
          <Card className="hover:bg-accent transition-colors h-full cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-foreground" />
                <CardTitle className="text-base">Прогресс</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Распределение и повторяющиеся ошибки
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stats" className="block">
          <Card className="hover:bg-accent transition-colors h-full cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-foreground" />
                <CardTitle className="text-base">Расходы</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Статистика по API провайдерам</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="pt-2 border-t flex flex-wrap gap-3">
        <LogoutButton />
      </div>
    </div>
  )
}
