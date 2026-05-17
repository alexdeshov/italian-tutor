import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'

type UsageRow = {
  id: string
  session_id: string | null
  provider: string
  input_units: number
  output_units: number
  cost_usd: number
  created_at: string
}

type SessionRow = {
  id: string
  topic: string
  started_at: string
  ended_at: string | null
  status: string
}

type ProviderStats = { cost: number; inputUnits: number; outputUnits: number }

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('ru-RU')
}

function fmtCost(n: number): string {
  return `$${n.toFixed(3)}`
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function ProviderRow({
  name,
  stats,
  detail,
}: {
  name: string
  stats: ProviderStats | undefined
  detail: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <div className="space-y-0.5">
        <span className="font-medium">{name}</span>
        {stats && stats.inputUnits > 0 && (
          <p className="text-xs text-muted-foreground">{detail}</p>
        )}
      </div>
      <span className="tabular-nums font-medium shrink-0 ml-4">
        {stats ? fmtCost(stats.cost) : '$0.000'}
      </span>
    </div>
  )
}

export default async function StatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: usage }, { data: sessions }] = await Promise.all([
    supabase
      .from('api_usage')
      .select('id, session_id, provider, input_units, output_units, cost_usd, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('id, topic, started_at, ended_at, status')
      .order('started_at', { ascending: false })
      .limit(20),
  ])

  const rows = (usage ?? []) as UsageRow[]
  const sessionList = (sessions ?? []) as SessionRow[]

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalCost = rows.reduce((sum, r) => sum + Number(r.cost_usd), 0)
  const monthCost = rows
    .filter((r) => r.created_at >= startOfMonth)
    .reduce((sum, r) => sum + Number(r.cost_usd), 0)
  const weekCost = rows
    .filter((r) => r.created_at >= sevenDaysAgo)
    .reduce((sum, r) => sum + Number(r.cost_usd), 0)

  // ── Provider breakdown ──────────────────────────────────────────────────────
  const byProvider = rows.reduce<Record<string, ProviderStats>>((acc, r) => {
    const p = r.provider
    if (!acc[p]) acc[p] = { cost: 0, inputUnits: 0, outputUnits: 0 }
    acc[p].cost += Number(r.cost_usd)
    acc[p].inputUnits += Number(r.input_units)
    acc[p].outputUnits += Number(r.output_units)
    return acc
  }, {})

  const whisper = byProvider['openai_whisper']
  const chat = byProvider['openai_chat']
  const claude = byProvider['anthropic_claude']
  const tts = byProvider['elevenlabs_tts']

  // ── Per-session cost ────────────────────────────────────────────────────────
  const costBySession = rows.reduce<Record<string, number>>((acc, r) => {
    if (!r.session_id) return acc
    acc[r.session_id] = (acc[r.session_id] ?? 0) + Number(r.cost_usd)
    return acc
  }, {})

  const sessionCosts = sessionList.map((s) => costBySession[s.id] ?? 0)
  const avgSessionCost =
    sessionCosts.length > 0 ? sessionCosts.reduce((a, b) => a + b, 0) / sessionCosts.length : 0

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Статистика расходов</h1>
        <Link href="/profile" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          ← Профиль
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="За всё время" value={`$${totalCost.toFixed(2)}`} />
        <StatCard label="За этот месяц" value={`$${monthCost.toFixed(2)}`} />
        <StatCard label="За 7 дней" value={`$${weekCost.toFixed(2)}`} />
      </div>

      {/* Provider breakdown */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Разбивка по провайдерам
        </h2>
        <div className="rounded-lg border border-border divide-y divide-border">
          <ProviderRow
            name="OpenAI Whisper (STT)"
            stats={whisper}
            detail={whisper ? `${Math.round(whisper.inputUnits / 60)} мин аудио` : ''}
          />
          <ProviderRow
            name="OpenAI Chat (GPT-4o)"
            stats={chat}
            detail={
              chat
                ? `${fmtNum(chat.inputUnits)} вход + ${fmtNum(chat.outputUnits)} выход токенов`
                : ''
            }
          />
          <ProviderRow
            name="Anthropic Claude (анализ)"
            stats={claude}
            detail={
              claude
                ? `${fmtNum(claude.inputUnits)} вход + ${fmtNum(claude.outputUnits)} выход токенов`
                : ''
            }
          />
          <ProviderRow
            name="ElevenLabs TTS"
            stats={tts}
            detail={tts ? `${fmtNum(tts.inputUnits)} символов` : ''}
          />
        </div>
      </section>

      {/* Sessions table */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Последние сессии
        </h2>
        {sessionList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Сессий пока нет.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                    Дата
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                    Тема
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                    Длит.
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                    Стоимость
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessionList.map((s) => {
                  const durationMin = s.ended_at
                    ? Math.round(
                        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
                          60_000,
                      )
                    : null
                  const cost = costBySession[s.id] ?? 0
                  const href =
                    s.status === 'active' ? `/sessions/${s.id}` : `/sessions/${s.id}/summary`

                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <Link href={href} className="block">
                          {new Date(s.started_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate">
                        <Link href={href} className="block" title={s.topic}>
                          {s.topic}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <Link href={href} className="block">
                          {durationMin != null ? `${durationMin} мин` : '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={href} className="block">
                          {cost > 0 ? fmtCost(cost) : '—'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/40">
                  <td colSpan={3} className="px-4 py-2.5 text-xs text-muted-foreground">
                    Средняя стоимость сессии
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-right tabular-nums">
                    {fmtCost(avgSessionCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
