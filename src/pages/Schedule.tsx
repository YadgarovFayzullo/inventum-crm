import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { findConflicts, normRoom, toMinutes } from '@/lib/conflicts'
import { isoWeekday, today, WEEKDAYS_SHORT } from '@/lib/dates'
import { fullName } from '@/lib/format'
import { GroupFormModal } from '@/components/GroupFormModal'
import { useAccess } from '@/store/auth'
import { useTeacherMap } from '@/store/hooks'
import { useStore } from '@/store/store'
import type { Group } from '@/store/types'
import { Button, EmptyState, Icon, PageHeader, Select, Tabs } from '@/ui'

const HOUR = 64 // высота часа в пикселях
const ALL = '__all'

const pad = (n: number) => String(n).padStart(2, '0')
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

type Placed = { g: Group; lane: number; lanes: number }

/** Раскладывает занятия одного дня по колонкам, чтобы пересекающиеся блоки не накрывали друг друга */
function layDay(list: Group[]): Placed[] {
  const sorted = [...list].sort((a, b) => a.timeStart.localeCompare(b.timeStart) || a.timeEnd.localeCompare(b.timeEnd))
  const out: Placed[] = []
  let cluster: Placed[] = []
  let clusterEnd = -1
  let laneEnds: number[] = []
  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length
    cluster = []
    laneEnds = []
  }
  for (const g of sorted) {
    const s = toMinutes(g.timeStart)
    const e = toMinutes(g.timeEnd)
    if (s >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= s)
    if (lane === -1) lane = laneEnds.push(e) - 1
    else laneEnds[lane] = e
    const p = { g, lane, lanes: 1 }
    cluster.push(p)
    out.push(p)
    clusterEnd = Math.max(clusterEnd, e)
  }
  flush()
  return out
}

export default function Schedule() {
  const navigate = useNavigate()
  const groups = useStore((s) => s.groups)
  const rooms = useStore((s) => s.settings.rooms)
  const teachers = useStore((s) => s.teachers)
  const teacherMap = useTeacherMap()
  const { can, ownsGroup } = useAccess()
  const manage = can('groups.manage')
  const [room, setRoom] = useState(ALL)
  const [teacherId, setTeacherId] = useState('')
  const [draft, setDraft] = useState<Partial<Group> | null>(null)
  const wd = isoWeekday(today())

  const active = useMemo(() => groups.filter((g) => !g.archived && ownsGroup(g)), [groups, ownsGroup])

  // кабинеты из настроек + те, что встречаются у групп (на случай старых записей)
  const roomList = useMemo(() => {
    const out = [...rooms]
    for (const g of active) if (g.room.trim() && !out.some((r) => normRoom(r) === normRoom(g.room))) out.push(g.room.trim())
    return out
  }, [rooms, active])

  const visible = useMemo(
    () => active.filter((g) => (room === ALL || normRoom(g.room) === normRoom(room)) && (!teacherId || g.teacherId === teacherId)),
    [active, room, teacherId],
  )

  // уже сохранённые пересечения (например, из данных до появления проверки)
  const conflicts = useMemo(() => {
    const seen = new Set<string>()
    const ids = new Set<string>()
    const lines: string[] = []
    for (const g of active) {
      for (const c of findConflicts(g, active)) {
        ids.add(g.id)
        ids.add(c.group.id)
        const key = [g.id, c.group.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        const t = teacherMap.get(g.teacherId)
        const why = [c.kinds.includes('room') && `кабинет ${g.room.trim()}`, c.kinds.includes('teacher') && (t ? fullName(t) : 'один преподаватель')].filter(Boolean).join(', ')
        lines.push(`«${g.name}» ${g.timeStart}–${g.timeEnd} и «${c.group.name}» ${c.group.timeStart}–${c.group.timeEnd}, ${c.days.map((d) => WEEKDAYS_SHORT[d - 1]).join(', ')} — ${why}`)
      }
    }
    return { ids, lines }
  }, [active, teacherMap])

  const [from, to] = useMemo(() => {
    let a = 8 * 60
    let b = 20 * 60
    for (const g of visible) {
      a = Math.min(a, Math.floor(toMinutes(g.timeStart) / 60) * 60)
      b = Math.max(b, Math.ceil(toMinutes(g.timeEnd) / 60) * 60)
    }
    return [a, Math.min(b, 24 * 60)]
  }, [visible])
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from + i * 60)

  const byDay = useMemo(() => WEEKDAYS_SHORT.map((_, i) => layDay(visible.filter((g) => g.days.includes(i + 1)))), [visible])
  const weekly = visible.reduce((n, g) => n + g.days.length, 0)

  /** Клик по пустому месту сетки — новая группа с этим днём и временем (шаг 30 минут, длительность 1,5 часа) */
  const pickSlot = (day: number, e: MouseEvent<HTMLDivElement>) => {
    if (!manage || e.target !== e.currentTarget) return
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const start = Math.min(from + Math.floor((y / HOUR) * 2) * 30, 24 * 60 - 90)
    setDraft({
      days: [day],
      timeStart: fromMinutes(start),
      timeEnd: fromMinutes(Math.min(start + 90, 24 * 60 - 1)),
      ...(room !== ALL ? { room } : {}),
      ...(teacherId ? { teacherId } : {}),
    })
  }

  return (
    <>
      <PageHeader
        title="Расписание"
        subtitle={`${weekly} ${plural(weekly, 'занятие', 'занятия', 'занятий')} в неделю`}
        actions={manage ? <Button icon="plus" onClick={() => setDraft({ ...(room !== ALL ? { room } : {}) })}>Новая группа</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {roomList.length > 1 && (
          <Tabs
            value={room}
            onChange={setRoom}
            tabs={[{ value: ALL, label: 'Все кабинеты' }, ...roomList.map((r) => ({ value: r, label: r }))]}
          />
        )}
        {manage && teachers.length > 1 && (
          <Select
            className="w-64"
            value={teacherId}
            placeholder="Все преподаватели"
            options={teachers.map((t) => ({ value: t.id, label: fullName(t) }))}
            onChange={setTeacherId}
          />
        )}
      </div>

      {conflicts.lines.length > 0 && (
        <div role="alert" className="mb-4 flex gap-3 rounded-2xl border border-primary-soft-2 bg-primary-soft p-4 text-[13px] text-primary-active">
          <Icon name="info" size={18} className="mt-px shrink-0" />
          <div className="grid gap-1">
            <span className="font-medium">Есть пересечения в расписании — откройте группу и измените время или кабинет</span>
            {conflicts.lines.map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>
      )}

      {active.length === 0 ? (
        <EmptyState icon="calendar" title="Расписание пустое" action={manage ? <Button icon="plus" onClick={() => setDraft({})}>Создать группу</Button> : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <div className="grid min-w-[860px] grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            {/* шапка */}
            <div className="sticky top-0 z-10 border-b border-line bg-surface" />
            {WEEKDAYS_SHORT.map((d, i) => (
              <div key={d} className={cn('sticky top-0 z-10 border-b border-l border-line bg-surface py-3 text-center text-[13px] font-medium', i + 1 === wd ? 'text-primary' : 'text-muted')}>
                {d}
                {i + 1 === wd && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />}
              </div>
            ))}

            {/* часы */}
            <div className="relative" style={{ height: hours.length * HOUR }}>
              {hours.map((h, i) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-subtle tabular-nums" style={{ top: i * HOUR }}>
                  {i === 0 ? '' : fromMinutes(h)}
                </span>
              ))}
            </div>

            {/* дни */}
            {byDay.map((placed, i) => (
              <div
                key={i}
                className={cn('relative border-l border-line', i + 1 === wd && 'bg-surface-2', manage && 'cursor-copy')}
                style={{
                  height: hours.length * HOUR,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${HOUR - 1}px, var(--color-line) ${HOUR - 1}px ${HOUR}px)`,
                }}
                onClick={(e) => pickSlot(i + 1, e)}
                title={manage ? 'Нажмите на свободное место, чтобы создать группу' : undefined}
              >
                {placed.map(({ g, lane, lanes }) => {
                  const s = toMinutes(g.timeStart)
                  const e = toMinutes(g.timeEnd)
                  const t = teacherMap.get(g.teacherId)
                  const bad = conflicts.ids.has(g.id)
                  const short = (e - s) / 60 * HOUR < 56
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => navigate(`/groups/${g.id}`)}
                      className={cn(
                        'absolute flex cursor-pointer flex-col overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left text-[12px] leading-snug transition-colors',
                        bad ? 'border-primary-active bg-primary-soft-2 ring-1 ring-primary-active' : 'border-primary bg-primary-soft hover:bg-primary-soft-2',
                      )}
                      style={{
                        top: ((s - from) / 60) * HOUR + 1,
                        height: ((e - s) / 60) * HOUR - 2,
                        left: `calc(${(lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                      }}
                      title={`${g.name} · ${g.timeStart}–${g.timeEnd} · каб. ${g.room || '—'}${t ? ` · ${fullName(t)}` : ''}`}
                    >
                      <span className="flex items-center gap-1 truncate font-medium text-fg">
                        {bad && <Icon name="info" size={13} className="shrink-0 text-primary-active" />}
                        <span className="truncate">{g.name}</span>
                      </span>
                      <span className="truncate text-muted tabular-nums">{g.timeStart}–{g.timeEnd}</span>
                      {!short && <span className="truncate text-muted">{room === ALL && roomList.length > 1 ? `Каб. ${g.room} · ` : ''}{t ? fullName(t) : '—'}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <GroupFormModal open={!!draft} onClose={() => setDraft(null)} initial={draft ?? undefined} onCreated={() => setDraft(null)} />
    </>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
