// Проверка пересечений расписания. Модуль без зависимостей — его используют и браузер, и сервер.
import type { Group } from '../store/types'

export type Slot = Pick<Group, 'id' | 'name' | 'teacherId' | 'days' | 'timeStart' | 'timeEnd' | 'room' | 'archived'>

export type Conflict = {
  group: Slot
  /** room — занят кабинет, teacher — преподаватель ведёт другую группу */
  kinds: ('room' | 'teacher')[]
  /** Общие дни недели (ISO: 1 = Пн … 7 = Вс) */
  days: number[]
}

const DAY = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export const normRoom = (r: string) => r.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')

/** 'HH:MM' → минуты от полуночи */
export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h! * 60 + m!
}

/** Интервалы [a, b) пересекаются: занятие 9:00–10:30 и 10:30–12:00 не конфликтуют */
export const timesOverlap = (a: Pick<Slot, 'timeStart' | 'timeEnd'>, b: Pick<Slot, 'timeStart' | 'timeEnd'>) =>
  toMinutes(a.timeStart) < toMinutes(b.timeEnd) && toMinutes(b.timeStart) < toMinutes(a.timeEnd)

/** Группы из списка, с которыми пересекается candidate. Архивные группы не учитываются. */
export function findConflicts(candidate: Omit<Slot, 'name'>, groups: readonly Slot[]): Conflict[] {
  if (candidate.archived) return []
  const room = normRoom(candidate.room)
  const out: Conflict[] = []
  for (const g of groups) {
    if (g.id === candidate.id || g.archived) continue
    const days = candidate.days.filter((d) => g.days.includes(d)).sort((a, b) => a - b)
    if (!days.length || !timesOverlap(candidate, g)) continue
    const kinds: Conflict['kinds'] = []
    if (room && normRoom(g.room) === room) kinds.push('room')
    if (candidate.teacherId && g.teacherId === candidate.teacherId) kinds.push('teacher')
    if (kinds.length) out.push({ group: g, kinds, days })
  }
  return out
}

/** «Кабинет 101 занят: «EN-Beginner A» Пн, Ср 09:00–10:30» */
export function describeConflict(c: Conflict, teacherName?: string) {
  const what = c.kinds.includes('room')
    ? `Кабинет ${c.group.room.trim()} занят${c.kinds.includes('teacher') ? ', и преподаватель тот же' : ''}`
    : `${teacherName ?? 'Преподаватель'} в это время ведёт другую группу`
  return `${what}: «${c.group.name}» ${c.days.map((d) => DAY[d]).join(', ')} ${c.group.timeStart}–${c.group.timeEnd}`
}
