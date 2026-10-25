import { memo, useCallback, useMemo, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatDateShort, isoWeekday, today, WEEKDAYS_SHORT } from '@/lib/dates'
import { fullName } from '@/lib/format'
import { overlapsMonth } from '@/store/billing'
import { enrollmentsOf, useEnrollmentsByGroup, useStudentMap } from '@/store/hooks'
import { MARK } from '@/store/labels'
import { lessonDates } from '@/store/schedule'
import { attKey, useStore } from '@/store/store'
import type { AttendanceMark, Group } from '@/store/types'
import { Avatar, EmptyState, Icon, Menu, type IconName, type MenuItem } from '@/ui'

const MARKS: AttendanceMark[] = ['present', 'absent', 'late', 'excused']

export const MARK_STYLE: Record<AttendanceMark, { cls: string; icon: IconName }> = {
  present: { cls: 'bg-success text-white', icon: 'check' },
  absent: { cls: 'bg-danger-soft text-danger', icon: 'close' },
  late: { cls: 'bg-primary text-white', icon: 'clock' },
  excused: { cls: 'bg-canvas text-muted', icon: 'minus' },
}

export function MarkIcon({ mark, size = 'md' }: { mark: AttendanceMark; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-md', size === 'sm' ? 'size-5' : 'size-6', MARK_STYLE[mark].cls)}>
      <Icon name={MARK_STYLE[mark].icon} size={size === 'sm' ? 12 : 13} stroke={2.4} />
    </span>
  )
}

const Cell = memo(function Cell({ mark, disabled, open, onClick, title }: { mark?: AttendanceMark; disabled: boolean; open: boolean; onClick: (e: MouseEvent<HTMLButtonElement>) => void; title: string }) {
  if (disabled) return <span className="mx-auto block size-8 rounded-lg bg-surface-2" />
  const st = mark && MARK_STYLE[mark]
  return (
    <button
      type="button"
      title={title}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        'mx-auto flex size-8 items-center justify-center rounded-lg transition-[transform,background-color,box-shadow] active:scale-90',
        st ? st.cls : 'border border-dashed border-line-strong hover:border-primary hover:bg-primary-soft',
        open && 'ring-2 ring-primary ring-offset-2',
      )}
    >
      {st && <Icon name={st.icon} size={15} stroke={2.2} />}
    </button>
  )
})

export function MarkLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted">
      {(Object.keys(MARK_STYLE) as AttendanceMark[]).map((m) => (
        <span key={m} className="inline-flex items-center gap-2">
          <MarkIcon mark={m} size="sm" />
          {MARK[m]}
        </span>
      ))}
      <span className="text-subtle">· клик по ячейке — выбор отметки (клавиши 1–5), по дате — «все были»</span>
    </div>
  )
}

export function AttendanceGrid({ group, month }: { group: Group; month: string }) {
  const attendance = useStore((s) => s.attendance)
  const setMark = useStore((s) => s.setMark)
  const setMarks = useStore((s) => s.setMarks)
  const studentMap = useStudentMap()
  const byGroup = useEnrollmentsByGroup()
  const now = today()
  const [picker, setPicker] = useState<{ date: string; studentId: string; rect: DOMRect } | null>(null)
  const closePicker = useCallback(() => setPicker(null), [])

  const pickerItems = useMemo<MenuItem[]>(() => {
    if (!picker) return []
    const current = attendance[attKey(group.id, picker.date, picker.studentId)]
    const set = (m: AttendanceMark | null) => () => setMark(group.id, picker.date, picker.studentId, m)
    return [
      ...MARKS.map((m, i) => ({ key: m, label: MARK[m], icon: <MarkIcon mark={m} />, active: current === m, hint: String(i + 1), onSelect: set(m) })),
      {
        key: 'clear',
        label: 'Снять отметку',
        icon: <span className="size-6 shrink-0 rounded-md border border-dashed border-line-strong" />,
        hint: '5',
        divider: true,
        onSelect: set(null),
      },
    ]
  }, [picker, attendance, group.id, setMark])

  const dates = useMemo(() => lessonDates(group, month), [group, month])
  const rows = useMemo(() => {
    const seen = new Map<string, { studentId: string; ranges: [string, string][] }>()
    for (const e of enrollmentsOf(byGroup, group.id)) {
      if (!overlapsMonth(e, month)) continue
      const r = seen.get(e.studentId) ?? { studentId: e.studentId, ranges: [] }
      r.ranges.push([e.startDate, e.endDate ?? '9999-12-31'])
      seen.set(e.studentId, r)
    }
    return [...seen.values()]
      .filter((r) => studentMap.has(r.studentId))
      .sort((a, b) => fullName(studentMap.get(a.studentId)!).localeCompare(fullName(studentMap.get(b.studentId)!)))
  }, [byGroup, group.id, month, studentMap])

  if (dates.length === 0) return <EmptyState icon="calendar" title="В этом месяце занятий нет" text="Проверьте расписание группы или дату старта." />
  if (rows.length === 0) return <EmptyState icon="users" title="В группе нет учеников" text="Добавьте учеников, чтобы отмечать посещаемость." />

  const inRange = (ranges: [string, string][], d: string) => ranges.some(([a, b]) => d >= a && d <= b)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-56 bg-surface px-4 py-3 text-left text-xs tracking-wide text-subtle uppercase">Ученик</th>
            {dates.map((d) => {
              const future = d > now
              const ids = rows.filter((r) => inRange(r.ranges, d) && !attendance[attKey(group.id, d, r.studentId)]).map((r) => r.studentId)
              return (
                <th key={d} className="px-1 py-2 text-center">
                  <button
                    type="button"
                    disabled={future || ids.length === 0}
                    onClick={() => setMarks(group.id, d, ids, 'present')}
                    title={future ? undefined : 'Отметить всех оставшихся как «был»'}
                    className={cn(
                      'mx-auto flex w-11 flex-col items-center rounded-lg py-1 leading-tight transition-colors enabled:hover:bg-primary-soft',
                      d === now ? 'bg-primary text-white enabled:hover:bg-primary-hover' : future ? 'text-subtle' : 'text-fg',
                    )}
                  >
                    <span className="text-[11px] opacity-70">{WEEKDAYS_SHORT[isoWeekday(d) - 1]}</span>
                    <span className="text-[13px]">{formatDateShort(d)}</span>
                  </button>
                </th>
              )
            })}
            <th className="px-4 py-3 text-right text-xs tracking-wide text-subtle uppercase">Посещ.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = studentMap.get(r.studentId)!
            let marked = 0
            let attended = 0
            return (
              <tr key={r.studentId} className="group/row">
                <td className="sticky left-0 z-10 border-t border-line bg-surface px-4 py-2 group-hover/row:bg-surface-2">
                  <Link to={`/students/${s.id}`} className="flex items-center gap-2.5 hover:text-primary">
                    <Avatar seed={s.id} photoVersion={s.photoVersion} name={fullName(s)} size={28} />
                    <span className="truncate">{fullName(s)}</span>
                  </Link>
                </td>
                {dates.map((d) => {
                  const k = attKey(group.id, d, r.studentId)
                  const mark = attendance[k]
                  const disabled = d > now || !inRange(r.ranges, d)
                  if (mark) {
                    marked++
                    if (mark === 'present' || mark === 'late') attended++
                  }
                  return (
                    <td key={d} className="border-t border-line px-1 py-2 group-hover/row:bg-surface-2">
                      <Cell
                        mark={mark}
                        disabled={disabled}
                        open={picker?.date === d && picker.studentId === r.studentId}
                        title={`${formatDateShort(d)} · ${mark ? MARK[mark] : 'нет отметки'}`}
                        onClick={(e) => setPicker({ date: d, studentId: r.studentId, rect: e.currentTarget.getBoundingClientRect() })}
                      />
                    </td>
                  )
                })}
                <td className="border-t border-line px-4 py-2 text-right whitespace-nowrap group-hover/row:bg-surface-2">
                  {marked ? (
                    <span className={attended / marked < 0.7 ? 'text-primary' : ''}>{Math.round((attended / marked) * 100)}%</span>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Menu
        anchor={picker?.rect ?? null}
        items={pickerItems}
        onClose={closePicker}
        title={picker ? `${fullName(studentMap.get(picker.studentId)!)} · ${formatDateShort(picker.date)}` : undefined}
      />
    </div>
  )
}
