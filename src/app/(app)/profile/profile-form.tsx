'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

type Props = {
  email: string
  initialName: string | null
  initialLevel: string
}

export function ProfileForm({ email, initialName, initialLevel }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName ?? '')
  const [level, setLevel] = useState(initialLevel)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const fd = new FormData()
    fd.set('name', name)
    fd.set('italian_level', level)
    await updateProfile(fd)

    setSaving(false)
    setSaved(true)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="space-y-1.5">
        <Label>Email</Label>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="level">Italian level (CEFR)</Label>
        <Select value={level} onValueChange={setLevel} name="italian_level">
          <SelectTrigger id="level" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CEFR_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">Saved.</span>
        )}
      </div>

      <div className="pt-4 border-t space-y-3">
        <Button type="button" variant="outline" onClick={handleLogout}>
          Logout
        </Button>
        <div>
          <Link
            href="/profile/password"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Изменить пароль
          </Link>
        </div>
      </div>
    </form>
  )
}
