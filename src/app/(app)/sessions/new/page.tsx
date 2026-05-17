import Link from 'next/link'
import { createSession } from '../actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function NewSessionPage() {
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

      <h1 className="text-xl font-semibold mb-6">Новая сессия</h1>

      <form action={createSession} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic">О чём поговорим?</Label>
          <Textarea
            id="topic"
            name="topic"
            placeholder="Например: заказ кофе в баре в Риме"
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
