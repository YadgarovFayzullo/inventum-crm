import { daysInMonth, isoWeekday } from '@/lib/dates'
import type { Group } from './types'

/** Даты занятий группы в месяце по расписанию */
export function lessonDates(group: Pick<Group, 'days' | 'startDate'>, month: string) {
  const out: string[] = []
  const n = daysInMonth(month)
  for (let d = 1; d <= n; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`
    if (iso >= group.startDate && group.days.includes(isoWeekday(iso))) out.push(iso)
  }
  return out
}
