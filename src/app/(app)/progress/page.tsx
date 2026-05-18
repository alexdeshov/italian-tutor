import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorTypeChart } from './ErrorTypeChart'
import { TopErrorsList, type TopError } from './TopErrorsList'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: errors } = await supabase
    .from('errors')
    .select('error_type, original_quote, correction, explanation_ru, session_id')

  if (!errors || errors.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="size-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-medium">Пока нет данных</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Аналитика появится после первой завершённой сессии с разбором. Иди потренируйся!
          </p>
          <Link href="/sessions/new" className={buttonVariants({ className: 'mt-6' })}>
            Начать сессию
          </Link>
        </div>
      </div>
    )
  }

  // ── Summary numbers ─────────────────────────────────────────────────────────
  const totalErrors = errors.length
  const sessionsWithErrors = new Set(errors.map((e) => e.session_id)).size
  const avgPerSession = (totalErrors / sessionsWithErrors).toFixed(1)

  // ── Error type breakdown ────────────────────────────────────────────────────
  const typeCounts = errors.reduce<Record<string, number>>((acc, e) => {
    acc[e.error_type] = (acc[e.error_type] ?? 0) + 1
    return acc
  }, {})

  // ── Top recurring errors (grouped by correction text) ──────────────────────
  const grouped = new Map<
    string,
    { correction: string; count: number; examples: TopError['examples'] }
  >()

  for (const e of errors) {
    const key = e.correction.toLowerCase().trim()
    if (!grouped.has(key)) {
      grouped.set(key, { correction: e.correction, count: 0, examples: [] })
    }
    const item = grouped.get(key)!
    item.count++
    if (item.examples.length < 3) {
      item.examples.push({
        original: e.original_quote,
        explanation: e.explanation_ru,
        error_type: e.error_type,
      })
    }
  }

  const topErrors: TopError[] = Array.from(grouped.values())
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold">Прогресс</h1>
        <p className="text-muted-foreground text-sm mt-1">Где ты регулярно спотыкаешься</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Всего ошибок" value={totalErrors} />
        <StatCard label="Сессий с разбором" value={sessionsWithErrors} />
        <StatCard label="Среднее на сессию" value={avgPerSession} />
      </div>

      {/* Donut chart */}
      <Card>
        <CardHeader>
          <CardTitle>Распределение по типам</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorTypeChart data={typeCounts} />
        </CardContent>
      </Card>

      {/* Top recurring errors */}
      {topErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Топ повторяющихся ошибок</CardTitle>
            <CardDescription>На эти конструкции стоит обратить внимание</CardDescription>
          </CardHeader>
          <CardContent>
            <TopErrorsList errors={topErrors} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
