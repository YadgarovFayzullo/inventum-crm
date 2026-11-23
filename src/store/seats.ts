import { memoRefs } from '@/lib/memo'
import { formatDays } from '@/lib/dates'
import { useStore } from './store'
import type { Enrollment, Group, ID, Lead, TimeSlot } from './types'

/** Заполненность группы: ученики + открытые заявки, которые ведём в эту группу */
export type Seats = {
  enrolled: number
  /** Открытые лиды (не «Записались» и не «Отказ») с этой группой */
  reserved: number
  capacity: number
  /** Сколько мест остаётся с учётом заявок (не меньше нуля) */
  free: number
  /** Учеников уже столько, сколько мест: записать больше нельзя */
  full: boolean
}

export const isOpenLead = (l: Lead) => l.status !== 'won' && l.status !== 'lost'

export function computeSeats(groups: Group[], enrollments: Enrollment[], leads: Lead[]) {
  const enrolled = new Map<ID, number>()
  for (const e of enrollments) if (!e.endDate) enrolled.set(e.groupId, (enrolled.get(e.groupId) ?? 0) + 1)
  const reserved = new Map<ID, number>()
  for (const l of leads) if (l.groupId && isOpenLead(l)) reserved.set(l.groupId, (reserved.get(l.groupId) ?? 0) + 1)
  const out = new Map<ID, Seats>()
  for (const g of groups) {
    const en = enrolled.get(g.id) ?? 0
    const re = reserved.get(g.id) ?? 0
    out.set(g.id, { enrolled: en, reserved: re, capacity: g.capacity, free: Math.max(0, g.capacity - en - re), full: en >= g.capacity })
  }
  return out
}

const seatsMemo = memoRefs(computeSeats)
export const useSeats = () => seatsMemo(useStore((s) => s.groups), useStore((s) => s.enrollments), useStore((s) => s.leads))

const EMPTY: Seats = { enrolled: 0, reserved: 0, capacity: 0, free: 0, full: true }
export const seatsOf = (m: Map<ID, Seats>, id: ID) => m.get(id) ?? EMPTY

/** Часть дня, на которую приходится начало занятия */
export function slotOf(time: string): TimeSlot {
  const h = Number(time.slice(0, 2))
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

/** Подходит ли группа под пожелания лида (курс, дни, время). Пустое пожелание подходит под всё. */
export function fitsLead(g: Group, l: Pick<Lead, 'courseId' | 'preferredDays' | 'preferredSlot'>) {
  if (l.courseId && g.courseId !== l.courseId) return false
  if (l.preferredDays?.length && !g.days.some((d) => l.preferredDays!.includes(d))) return false
  if (l.preferredSlot && slotOf(g.timeStart) !== l.preferredSlot) return false
  return true
}

/** «12/15 · +2 в заявках» */
export function seatsHint(s: Seats) {
  if (s.full) return `${s.enrolled}/${s.capacity} · мест нет`
  return `${s.enrolled}/${s.capacity}${s.reserved ? ` · +${s.reserved} в заявках` : ''}`
}

export const groupLabel = (g: Group) => `${g.name} · ${formatDays(g.days)} ${g.timeStart}`

/**
 * Варианты групп для выбора лиду: только активные группы его курса, сначала подходящие по дням и времени.
 * Заполненная группа остаётся в списке только если лид уже в ней (чтобы не потерять выбор).
 */
export function groupOptions(
  groups: Group[],
  seats: Map<ID, Seats>,
  l: Pick<Lead, 'courseId' | 'preferredDays' | 'preferredSlot'>,
  current?: ID,
) {
  return groups
    .filter((g) => !g.archived && (!l.courseId || g.courseId === l.courseId))
    .map((g) => ({ g, s: seatsOf(seats, g.id), fit: fitsLead(g, l) }))
    .filter(({ g, s }) => !s.full || g.id === current)
    .sort((a, b) => Number(b.fit) - Number(a.fit) || a.g.timeStart.localeCompare(b.g.timeStart))
    .map(({ g, s, fit }) => ({ value: g.id, label: `${fit && (l.preferredDays?.length || l.preferredSlot) ? '✓ ' : ''}${groupLabel(g)}`, hint: seatsHint(s) }))
}
