'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, History, BarChart3, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  mobileLabel: string
  Icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/sessions/new', label: 'Новая сессия', mobileLabel: 'Новая', Icon: Plus },
  { href: '/sessions',     label: 'История',      mobileLabel: 'История', Icon: History },
  { href: '/stats',        label: 'Статистика',   mobileLabel: 'Статы', Icon: BarChart3 },
  { href: '/profile',      label: 'Профиль',      mobileLabel: 'Профиль', Icon: User },
]

type Props = { email: string }

export default function AppHeader({ email }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/sessions/new') return pathname === '/sessions/new'
    if (href === '/sessions')
      return pathname.startsWith('/sessions') && pathname !== '/sessions/new'
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-10 pt-[env(safe-area-inset-top)]">

      {/* ── Mobile nav: 4-column icon-above-label grid ─────────────────────── */}
      <div className="md:hidden grid grid-cols-4 divide-x divide-border">
        {NAV_ITEMS.map(({ href, label, mobileLabel, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'py-3 min-h-[60px] touch-manipulation select-none transition-colors',
              isActive(href)
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <Icon className="size-5" />
            <span className="text-[11px] font-medium leading-none">{mobileLabel}</span>
          </Link>
        ))}
      </div>

      {/* ── Desktop nav: unchanged horizontal layout ────────────────────────── */}
      <div className="hidden md:block">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <span className="font-semibold text-sm shrink-0 mr-3">Собеседник</span>

          <nav className="flex items-center gap-1">
            {/* Primary CTA */}
            <Link
              href="/sessions/new"
              className={cn(buttonVariants({ size: 'sm' }), 'gap-1')}
            >
              <Plus className="size-3.5" />
              Новая сессия
            </Link>

            {/* Secondary nav items */}
            {NAV_ITEMS.slice(1).map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'gap-1',
                  isActive(href)
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          {email && (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{email}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" />
            Выйти
          </Button>
        </div>
      </div>

    </header>
  )
}
