import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { currentMonth, daysInMonth, formatDate, isoWeekday, today, WEEKDAYS_SHORT } from '@/lib/dates'
import { useGroupMap } from '@/store/hooks'
import { MARK } from '@/store/labels'
import { useStore } from '@/store/store'
import type { AttendanceMark } from '@/store/types'
import { MARK_STYLE } from './AttendanceGrid'
import { MonthSwitcher } from './MonthSwitcher'
import { Icon } from '@/ui'

type DayMark = { groupId: string; mark: AttendanceMark }
const ORDER: AttendanceMark[] = ['present', 'absent', 'late', 'excused']

// Цвет числа поверх залитой клетки
const NUMBER_COLOR: Record<AttendanceMark, string> = {
  present: 'text-white/85',
  absent: 'text-danger',
  late: 'text-white/85',
  excused: 'text-muted',
}

/** Календарь посещаемости ученика за месяц: числа, дни недели, отметка в каждом дне занятий */
export function AttendanceCalendar({ studentId }: { studentId: string }) {
  const attendance = useStore((s) => s.attendance)
  const groupMap = useGroupMap()
  const [month, setMonth] = useState(currentMonth())
  const now = today()

  const { byDate, counts, total } = useMemo(() => {
    const byDate = new Map<string, DayMark[]>()
    const counts: Record<AttendanceMark, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    let total = 0
    const suffix = `|${studentId}`
    for (const k in attendance) {
      if (!k.endsWith(suffix)) continue
      const [groupId, date] = k.split('|') as [string, string]
      if (!date.startsWith(month)) continue
      const mark = attendance[k]!
      counts[mark]++
      total++
      const list = byDate.get(date)
      if (list) list.push({ groupId, mark })
      else byDate.set(date, [{ groupId, mark }])
    }
    return { byDate, counts, total }
  }, [attendance, studentId, month])

  const cells = useMemo(() => {
    const lead = isoWeekday(`${month}-01`) - 1
    return [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(month) }, (_, i) => i + 1)] as (number | null)[]
  }, [month])

  const rate = total ? Math.round(((counts.present + counts.late) / total) * 100) : null

  return (
    <div className="px-5 pb-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher value={month} onChange={setMonth} />
        <span className="text-muted">
          За месяц: <span className="font-semibold text-fg">{rate === null ? '—' : `${rate}%`}</span>
          {total > 0 && <span className="text-subtle"> · {total} занятий</span>}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ORDER.map((m) => (
          <div key={m} className="flex items-center gap-3 rounded-xl bg-canvas px-3.5 py-3">
            <span className={cn('inline-flex size-7 items-center justify-center rounded-lg', MARK_STYLE[m].cls)}>
              <Icon name={MARK_STYLE[m].icon} size={14} stroke={2.2} />
            </span>
            <div>
              <div className="text-lg leading-tight font-semibold">{counts[m]}</div>
              <div className="text-xs text-muted">{MARK[m]}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} className={cn('pb-1 text-center text-xs', i >= 5 ? 'text-primary' : 'text-subtle')}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />
          const iso = `${month}-${String(d).padStart(2, '0')}`
          const marks = byDate.get(iso)
          const isToday = iso === now
          const weekend = isoWeekday(iso) >= 6
          // Отметка заливает всю клетку; если в день было два занятия — клетка делится пополам
          if (marks) {
            return (
              <div key={iso} className={cn('relative flex h-16 overflow-hidden rounded-xl sm:h-[72px]', isToday && 'ring-2 ring-ink ring-offset-2')}>
                {marks.map((x) => (
                  <div
                    key={x.groupId}
                    title={`${formatDate(iso)} · ${groupMap.get(x.groupId)?.name ?? ''} · ${MARK[x.mark]}`}
                    className={cn('flex flex-1 items-center justify-center', MARK_STYLE[x.mark].cls)}
                  >
                    <Icon name={MARK_STYLE[x.mark].icon} size={marks.length > 1 ? 18 : 22} stroke={2.4} />
                  </div>
                ))}
                <span className={cn('absolute top-1.5 left-2 text-xs leading-none font-medium', NUMBER_COLOR[marks[0]!.mark])}>{d}</span>
              </div>
            )
          }
          return (
            <div
              key={iso}
              className={cn(
                'flex h-16 rounded-xl border p-1.5 sm:h-[72px] sm:p-2',
                isToday ? 'border-primary' : 'border-line',
                weekend && 'bg-surface-2',
              )}
            >
              <span className={cn('text-xs leading-none', isToday ? 'font-semibold text-primary' : 'text-subtle')}>{d}</span>
            </div>
          )
        })}
      </div>

      {total === 0 && <p className="mt-4 text-center text-muted">В этом месяце отметок нет</p>}
    </div>
  )
}
