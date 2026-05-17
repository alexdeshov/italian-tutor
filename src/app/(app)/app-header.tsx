'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'

type Props = { email: string }

const NAV_LINKS = [
  { href: '/sessions', label: 'История' },
  { href: '/stats', label: 'Статистика' },
  { href: '/profile', label: 'Профиль' },
] as const

export default function AppHeader({ email }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/sessions/new') return pathname === '/sessions/new'
    if (href === '/sessions')
      return pathname.startsWith('/sessions') && pathname !== '/sessions/new'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function navClass(href: string): string {
    const base = buttonVariants({ variant: 'ghost', size: 'sm' })
    return isActive(href)
      ? `${base} bg-accent text-accent-foreground font-medium`
      : `${base} text-muted-foreground`
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
        <span className="font-semibold text-sm shrink-0 mr-3 hidden sm:block">Italian Tutor</span>

        <nav className="flex items-center gap-1">
          <Link href="/sessions/new" className={buttonVariants({ size: 'sm' })}>
            + Сессия
          </Link>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={navClass(href)}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {email && (
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[180px]">
            {email}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Выйти">
          <LogOut className="size-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Выйти</span>
        </Button>
      </div>
    </header>
  )
}
