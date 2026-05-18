'use client'

import { Pie, PieChart, Cell, Label } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

// Colors intentionally match the badge palette used in error cards throughout the app.
const chartConfig = {
  grammar:      { label: 'Грамматика',   color: '#3b82f6' },
  lexicon:      { label: 'Лексика',      color: '#8b5cf6' },
  syntax:       { label: 'Синтаксис',    color: '#f97316' },
  style:        { label: 'Стиль',        color: '#f59e0b' },
  pronunciation:{ label: 'Произношение', color: '#10b981' },
} satisfies ChartConfig

export function ErrorTypeChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([type, count]) => ({
    type,
    count,
    fill: `var(--color-${type})`,
  }))

  const total = chartData.reduce((sum, d) => sum + d.count, 0)

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
        <Pie data={chartData} dataKey="count" nameKey="type" innerRadius={60} strokeWidth={2}>
          {chartData.map((entry) => (
            <Cell key={entry.type} fill={entry.fill} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-3xl font-bold"
                    >
                      {total}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 24}
                      className="fill-muted-foreground text-sm"
                    >
                      ошибок
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="type" />} />
      </PieChart>
    </ChartContainer>
  )
}
