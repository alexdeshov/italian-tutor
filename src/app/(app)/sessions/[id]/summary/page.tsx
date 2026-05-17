import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { formatDuration, formatCost } from '@/lib/format'
import { AnalyzeButton } from './AnalyzeButton'
import { AnalysisRunner } from './AnalysisRunner'

type Props = { params: Promise<{ id: string }> }

type VocabItem = { italian: string; russian: string; note?: string }

const ERROR_TYPE_LABEL: Record<string, string> = {
  grammar: 'Грамматика',
  lexicon: 'Лексика',
  syntax: 'Синтаксис',
  style: 'Стиль',
  pronunciation: 'Произношение',
}

const ERROR_TYPE_CLASS: Record<string, string> = {
  grammar: 'bg-blue-100 text-blue-700',
  lexicon: 'bg-violet-100 text-violet-700',
  syntax: 'bg-orange-100 text-orange-700',
  style: 'bg-amber-100 text-amber-700',
  pronunciation: 'bg-emerald-100 text-emerald-700',
}

export default async function SummaryPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, topic, started_at, ended_at, status')
    .eq('id', id)
    .single()

  if (!session) notFound()
  if (session.status !== 'completed') redirect(`/sessions/${id}`)

  const [{ data: summary }, { data: errors }, { data: usageRows }] = await Promise.all([
    supabase
      .from('summaries')
      .select('overall_comment, useful_vocabulary, level_observation')
      .eq('session_id', id)
      .maybeSingle(),
    supabase
      .from('errors')
      .select('id, original_quote, correction, explanation_ru, error_type')
      .eq('session_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('api_usage').select('cost_usd').eq('session_id', id),
  ])

  const date = new Date(session.started_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const durationSec = session.ended_at
    ? (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
    : null

  const totalCost = (usageRows ?? []).reduce((sum, r) => sum + Number(r.cost_usd), 0)

  const vocab = summary ? (summary.useful_vocabulary as VocabItem[] | null) ?? [] : []

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Тема</p>
          <h1 className="text-xl font-semibold">{session.topic}</h1>
          <p className="text-sm text-muted-foreground">
            {date}
            {durationSec != null ? ` · ${formatDuration(durationSec)}` : ''}
            {totalCost > 0 ? ` · ${formatCost(totalCost)}` : ''}
          </p>
        </div>
        <Link href="/sessions" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          ← История
        </Link>
      </div>

      {!summary ? (
        <AnalysisRunner sessionId={id} />
      ) : (
        <>
          {/* Overall comment */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Общий комментарий
            </h2>
            <p className="text-sm leading-relaxed">{summary.overall_comment}</p>
          </section>

          {/* Level observation */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Оценка уровня
            </h2>
            <p className="text-sm leading-relaxed">{summary.level_observation}</p>
          </section>

          {/* Errors */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ошибки{errors && errors.length > 0 ? ` (${errors.length})` : ''}
            </h2>
            {errors && errors.length > 0 ? (
              <div className="space-y-3">
                {errors.map((err) => (
                  <div key={err.id} className="rounded-lg border border-border p-4 space-y-2">
                    <span
                      className={[
                        'inline-block text-xs font-medium px-2 py-0.5 rounded-full',
                        ERROR_TYPE_CLASS[err.error_type] ?? 'bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      {ERROR_TYPE_LABEL[err.error_type] ?? err.error_type}
                    </span>
                    <p className="text-sm italic text-muted-foreground">
                      «{err.original_quote}»
                    </p>
                    <p className="text-sm font-semibold text-emerald-600">→ {err.correction}</p>
                    <p className="text-sm">{err.explanation_ru}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ошибок не найдено — отлично!</p>
            )}
          </section>

          {/* Useful vocabulary */}
          {vocab.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Полезная лексика
              </h2>
              <div className="rounded-lg border border-border divide-y divide-border">
                {vocab.map((item, i) => (
                  <div key={i} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                    <span className="font-medium">{item.italian}</span>
                    <span className="text-muted-foreground">
                      {item.russian}
                      {item.note ? ` — ${item.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Re-analyze */}
          <div className="pt-4 border-t border-border">
            <AnalyzeButton sessionId={id} label="Переанализировать" />
          </div>
        </>
      )}
    </div>
  )
}
