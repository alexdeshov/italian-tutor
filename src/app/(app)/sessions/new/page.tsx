import Link from 'next/link'
import { createSession } from '../actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/server'
import { LANGUAGE_LABEL, TOPIC_PLACEHOLDER, toTargetLanguage } from '@/lib/languages'

export default async function NewSessionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('target_language').eq('id', user.id).single()
    : { data: null }
  const language = toTargetLanguage(profile?.target_language)

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="mb-6">
        <Link
          href="/profile"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Назад
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-1">Новая сессия</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Язык: {LANGUAGE_LABEL[language]} · сменить в{' '}
        <Link href="/profile" className="underline underline-offset-4 hover:text-foreground">
          профиле
        </Link>
      </p>

      <form action={createSession} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic">О чём поговорим?</Label>
          <Textarea
            id="topic"
            name="topic"
            placeholder={TOPIC_PLACEHOLDER[language]}
            rows={4}
            required
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit">Начать сессию</Button>
          <Link href="/profile" className={buttonVariants({ variant: 'ghost' })}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  )
}
