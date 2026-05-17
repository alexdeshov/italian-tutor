'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type View = 'password' | 'magic-link' | 'magic-sent'

export default function LoginPage() {
  const router = useRouter()

  const [view, setView] = useState<View>('password')

  // Password form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // Magic link form state
  const [magicEmail, setMagicEmail] = useState('')
  const [mlLoading, setMlLoading] = useState(false)
  const [mlError, setMlError] = useState<string | null>(null)

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setPwLoading(true)
    setPwError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setPwError('Неверный email или пароль.')
      setPwLoading(false)
    } else {
      // router.refresh() invalidates the server component cache so /profile
      // reads the new session on the very first render after redirect.
      router.push('/profile')
      router.refresh()
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMlLoading(true)
    setMlError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setMlLoading(false)
    if (error) {
      setMlError(error.message)
    } else {
      setView('magic-sent')
    }
  }

  if (view === 'magic-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm w-full space-y-3 text-center px-4">
          <h1 className="text-xl font-semibold">Проверь почту</h1>
          <p className="text-muted-foreground text-sm">
            Отправили ссылку на <strong>{magicEmail}</strong>.
          </p>
          <button
            onClick={() => { setView('password'); setMlError(null) }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            ← Назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-sm w-full space-y-6 px-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Italian Tutor</h1>
          <p className="text-muted-foreground text-sm">Вход в аккаунт</p>
        </div>

        {/* ── Password form ─────────────────────────────────────────────── */}
        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {pwError && <p className="text-sm text-destructive">{pwError}</p>}

          <Button type="submit" className="w-full" disabled={pwLoading}>
            {pwLoading ? 'Входим…' : 'Войти'}
          </Button>
        </form>

        {/* ── Magic link toggle / form ───────────────────────────────────── */}
        {view === 'password' && (
          <button
            type="button"
            onClick={() => { setView('magic-link'); setPwError(null) }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 block"
          >
            Войти по magic link
          </button>
        )}

        {view === 'magic-link' && (
          <form onSubmit={handleMagicLink} className="space-y-3 border-t pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="magic-email">Email для magic link</Label>
              <Input
                id="magic-email"
                type="email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            {mlError && <p className="text-sm text-destructive">{mlError}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={mlLoading}>
                {mlLoading ? 'Отправляем…' : 'Отправить ссылку'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setView('password'); setMlError(null) }}
              >
                Отмена
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
