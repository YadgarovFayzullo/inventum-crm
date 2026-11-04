import { formatMoney } from '@/lib/format'

export type BarGroup = { label: string; highlight?: boolean; values: number[] }
export type BarSeries = { name: string; className: string }

const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 })

/** Столбчатая диаграмма: по группе (месяцу) — несколько столбцов. Чистый SVG, без библиотек. */
export function BarChart({ groups, series }: { groups: BarGroup[]; series: BarSeries[] }) {
  const W = 560
  const H = 220
  const padL = 44
  const padB = 28
  const padT = 8
  const max = Math.max(1, ...groups.flatMap((g) => g.values))
  const plotH = H - padB - padT
  const step = (W - padL) / groups.length
  const barW = Math.min(26, (step - 14) / series.length)
  const ticks = [0, 0.5, 1]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Диаграмма по месяцам">
        {ticks.map((t) => {
          const y = padT + plotH * (1 - t)
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} className="stroke-line" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end" className="fill-subtle text-[10px]">{compact.format(max * t)}</text>
            </g>
          )
        })}
        {groups.map((g, gi) => {
          const x0 = padL + gi * step + (step - barW * series.length - (series.length - 1) * 3) / 2
          return (
            <g key={g.label}>
              {g.values.map((v, si) => {
                const h = (v / max) * plotH
                return (
                  <rect key={si} x={x0 + si * (barW + 3)} y={padT + plotH - h} width={barW} height={Math.max(h, v > 0 ? 2 : 0)} rx={3} className={series[si]!.className}>
                    <title>{`${g.label} · ${series[si]!.name}: ${formatMoney(v)}`}</title>
                  </rect>
                )
              })}
              <text x={padL + gi * step + step / 2} y={H - 8} textAnchor="middle" className={g.highlight ? 'fill-primary text-[11px] font-semibold' : 'fill-muted text-[11px]'}>{g.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-sm ${s.className.replace('fill-', 'bg-')}`} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export const DONUT_COLORS = ['#e07236', '#2f9e6e', '#4c6fff', '#d6a21e', '#c04f7a', '#2aa7b8', '#8a63d2', '#8b8f99']

/** Кольцевая диаграмма с легендой. Доли считаются от суммы переданных кусков. */
export function DonutChart({ slices }: { slices: { label: string; value: number }[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  if (total === 0) return <p className="text-muted">За этот месяц записей нет</p>
  const R = 52
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0 -rotate-90" role="img" aria-label="Диаграмма по категориям">
        {slices.map((s, i) => {
          const len = (s.value / total) * C
          const el = (
            <circle key={s.label} cx={70} cy={70} r={R} fill="none" strokeWidth={22} stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}>
              <title>{`${s.label}: ${formatMoney(s.value)}`}</title>
            </circle>
          )
          offset += len
          return el
        })}
      </svg>
      <ul className="flex min-w-48 flex-1 flex-col gap-1.5 text-[13px]">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="whitespace-nowrap text-muted">{Math.round((s.value / total) * 100)}% · {formatMoney(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
