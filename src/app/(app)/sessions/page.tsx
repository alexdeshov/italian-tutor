import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { formatDate, formatDuration, formatCost, truncate } from '@/lib/format'

type Session = {
  id: string
  topic: string
  started_at: string
  ended_at: string | null
  status: string
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Активна',
  completed: 'Завершена',
  abandoned: 'Прервана',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  abandoned: 'bg-muted text-muted-foreground',
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, topic, started_at, ended_at, status')
    .order('started_at', { ascending: false })
    .limit(50)

  const sessionList = (sessions ?? []) as Session[]
  const sessionIds = sessionList.map((s) => s.id)

  const errorCountMap = new Map<string, number>()
  const costMap = new Map<string, number>()

  if (sessionIds.length > 0) {
    const [{ data: errorsData }, { data: usageData }] = await Promise.all([
      supabase.from('errors').select('session_id').in('session_id', sessionIds),
      supabase.from('api_usage').select('session_id, cost_usd').in('session_id', sessionIds),
    ])

    for (const row of errorsData ?? []) {
      errorCountMap.set(row.session_id, (errorCountMap.get(row.session_id) ?? 0) + 1)
    }
    for (const row of usageData ?? []) {
      costMap.set(row.session_id, (costMap.get(row.session_id) ?? 0) + Number(row.cost_usd))
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">История сессий</h1>
          {sessionList.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">Всего: {sessionList.length}</p>
          )}
        </div>
        <Link href="/sessions/new" className={buttonVariants({ size: 'sm' })}>
          + Новая сессия
        </Link>
      </div>

      {sessionList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <p className="text-muted-foreground">Ещё нет сессий.</p>
          <Link href="/sessions/new" className={buttonVariants()}>
            Начать первую сессию
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop table ────────────────────────────────────────────────── */}
          <div className="hidden md:block space-y-3">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Дата
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Тема</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                      Статус
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Длит.
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Ошибок
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Стоимость
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessionList.map((s) => {
                    const durationSec =
                      s.ended_at != null
                        ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
                          1000
                        : null
                    const errorCount = errorCountMap.get(s.id)
                    const cost = costMap.get(s.id) ?? 0
                    const href =
                      s.status === 'active' ? `/sessions/${s.id}` : `/sessions/${s.id}/summary`

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          <Link href={href} className="block">
                            {formatDate(s.started_at)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <Link href={href} className="block truncate" title={s.topic}>
                            {truncate(s.topic, 60)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={href} className="block">
                            <span
                              className={[
                                'inline-block text-xs font-medium px-2 py-0.5 rounded-full',
                                STATUS_CLASS[s.status] ?? 'bg-muted text-muted-foreground',
                              ].join(' ')}
                            >
                              {STATUS_LABEL[s.status] ?? s.status}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          <Link href={href} className="block">
                            {durationSec != null ? formatDuration(durationSec) : '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          <Link href={href} className="block">
                            {s.status === 'completed' ? (errorCount ?? 0) : '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={href} className="block">
                            {cost > 0 ? formatCost(cost) : '—'}
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Показаны последние 50 сессий
            </p>
          </div>

          {/* ── Mobile cards ─────────────────────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {sessionList.map((s) => {
              const durationSec =
                s.ended_at != null
                  ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000
                  : null
              const errorCount = errorCountMap.get(s.id)
              const cost = costMap.get(s.id) ?? 0
              const href =
                s.status === 'active' ? `/sessions/${s.id}` : `/sessions/${s.id}/summary`

              const meta = [
                formatDate(s.started_at),
                durationSec != null ? formatDuration(durationSec) : null,
                s.status === 'completed' ? `ошибок: ${errorCount ?? 0}` : null,
                cost > 0 ? formatCost(cost) : null,
              ]
                .filter(Boolean)
                .join(' · ')

              return (
                <Link
                  key={s.id}
                  href={href}
                  className="block rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors active:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate flex-1">{truncate(s.topic, 60)}</p>
                    {s.status !== 'completed' && (
                      <span
                        className={[
                          'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                          STATUS_CLASS[s.status] ?? 'bg-muted text-muted-foreground',
                        ].join(' ')}
                      >
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{meta}</p>
                </Link>
              )
            })}
            <p className="text-xs text-muted-foreground text-center">
              Показаны последние 50 сессий
            </p>
          </div>
        </>
      )}
    </div>
  )
}
