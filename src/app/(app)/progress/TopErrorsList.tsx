export type TopError = {
  correction: string
  count: number
  examples: {
    original: string
    explanation: string
    error_type: string
  }[]
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  grammar:      { label: 'Грамматика',   className: 'bg-blue-100 text-blue-700' },
  lexicon:      { label: 'Лексика',      className: 'bg-violet-100 text-violet-700' },
  syntax:       { label: 'Синтаксис',    className: 'bg-orange-100 text-orange-700' },
  style:        { label: 'Стиль',        className: 'bg-amber-100 text-amber-700' },
  pronunciation:{ label: 'Произношение', className: 'bg-emerald-100 text-emerald-700' },
}

export function TopErrorsList({ errors }: { errors: TopError[] }) {
  return (
    <div className="space-y-4">
      {errors.map((err, idx) => (
        <div key={idx} className="rounded-lg border border-border p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-foreground">{err.count}</span>
            <span className="text-sm text-muted-foreground">раз встречалось</span>
          </div>

          <div className="text-base font-medium text-foreground mb-2">{err.correction}</div>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none list-none">
              Примеры и объяснения
            </summary>
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-border">
              {err.examples.map((ex, i) => {
                const badge = TYPE_BADGES[ex.error_type]
                return (
                  <div key={i}>
                    {badge && (
                      <span
                        className={[
                          'inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1',
                          badge.className,
                        ].join(' ')}
                      >
                        {badge.label}
                      </span>
                    )}
                    <p className="text-muted-foreground italic">«{ex.original}»</p>
                    <p className="text-foreground mt-1">{ex.explanation}</p>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      ))}
    </div>
  )
}
