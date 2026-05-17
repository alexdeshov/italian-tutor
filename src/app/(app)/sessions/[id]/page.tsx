import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { endSession } from '../actions'
import { Button, buttonVariants } from '@/components/ui/button'

type Props = { params: Promise<{ id: string }> }

export default async function SessionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, topic, status, started_at')
    .eq('id', id)
    .single()

  if (!session) notFound()

  if (session.status !== 'active') {
    return (
      <div className="max-w-md mx-auto py-10 px-4 space-y-4">
        <p className="text-muted-foreground">Эта сессия уже завершена.</p>
        <Link
          href={`/sessions/${id}/summary`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Посмотреть итоги
        </Link>
      </div>
    )
  }

  const boundEndSession = endSession.bind(null, id)

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Тема
        </p>
        <h1 className="text-xl font-semibold">{session.topic}</h1>
      </div>

      <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
        Сессия активна — здесь скоро появится голосовой интерфейс.
      </div>

      <form action={boundEndSession}>
        <Button type="submit" variant="destructive">
          Завершить сессию
        </Button>
      </form>
    </div>
  )
}
