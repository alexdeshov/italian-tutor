'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'

type Props = { email: string }

export default function AppHeader({ email }: Props) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
        <span className="font-semibold text-sm shrink-0 mr-3">Italian Tutor</span>

        <nav className="flex items-center gap-1">
          <Link href="/sessions/new" className={buttonVariants({ size: 'sm' })}>
            + Сессия
          </Link>
          <Link href="/sessions" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            История
          </Link>
          <Link href="/stats" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Статистика
          </Link>
          <Link href="/profile" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Профиль
          </Link>
        </nav>

        <div className="flex-1" />

        {email && (
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[180px]">
            {email}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Выйти
        </Button>
      </div>
    </header>
  )
}
