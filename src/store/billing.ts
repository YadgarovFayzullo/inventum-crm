import { addMonths, currentMonth, daysInMonth, monthEnd, monthKey, monthStart, today } from '@/lib/dates'
import { memoRefs } from '@/lib/memo'
import type { Enrollment, Group, ID, Payment, Student } from './types'

/*
  Начисления — помесячно, пропорционально дням нахождения в группе.
  Текущий месяц начисляется целиком (предоплата). При переводе в середине месяца
  старая группа начисляет до дня перевода, новая — с него, двойного начисления нет.
*/

const round100 = (n: number) => Math.round(n / 100) * 100

export function enrollmentCharges(e: Enrollment, price: number, discount: number, until = currentMonth()) {
  const out: { month: string; amount: number }[] = []
  const end = e.endDate ?? monthEnd(until)
  const lastMonth = monthKey(end) < until ? monthKey(end) : until
  const monthly = price * (1 - discount / 100)
  for (let m = monthKey(e.startDate); m <= lastMonth; m = addMonths(m, 1)) {
    const from = m === monthKey(e.startDate) ? Number(e.startDate.slice(8)) : 1
    const to = m === monthKey(end) ? Number(end.slice(8)) : daysInMonth(m)
    const days = Math.max(0, to - from + 1)
    if (days > 0) out.push({ month: m, amount: round100((monthly * days) / daysInMonth(m)) })
  }
  return out
}

export type Balance = { charged: number; paid: number; balance: number }

/** Баланс по каждому ученику (и по каждой паре ученик+группа). Пересчитывается только при изменении данных. */
export const computeBalances = memoRefs(
  (students: Student[], groups: Group[], enrollments: Enrollment[], payments: Payment[]) => {
    const groupPrice = new Map(groups.map((g) => [g.id, g.price]))
    const discount = new Map(students.map((s) => [s.id, s.discount]))
    const byStudent = new Map<ID, Balance>()
    const byPair = new Map<string, Balance>()
    const get = (map: Map<string, Balance>, k: string) => {
      let b = map.get(k)
      if (!b) map.set(k, (b = { charged: 0, paid: 0, balance: 0 }))
      return b
    }
    for (const e of enrollments) {
      const price = groupPrice.get(e.groupId)
      if (price === undefined) continue
      const total = enrollmentCharges(e, price, discount.get(e.studentId) ?? 0).reduce((a, c) => a + c.amount, 0)
      get(byStudent, e.studentId).charged += total
      get(byPair, `${e.studentId}|${e.groupId}`).charged += total
    }
    for (const p of payments) {
      get(byStudent, p.studentId).paid += p.amount
      get(byPair, `${p.studentId}|${p.groupId}`).paid += p.amount
    }
    for (const b of byStudent.values()) b.balance = b.paid - b.charged
    for (const b of byPair.values()) b.balance = b.paid - b.charged
    return { byStudent, byPair }
  },
)

export const EMPTY_BALANCE: Balance = { charged: 0, paid: 0, balance: 0 }

/** Сумма к оплате за месяц по паре ученик+группа */
export function monthCharge(enrollments: Enrollment[], studentId: ID, group: Group, discount: number, month = currentMonth()) {
  return enrollments
    .filter((e) => e.studentId === studentId && e.groupId === group.id)
    .flatMap((e) => enrollmentCharges(e, group.price, discount, month))
    .filter((c) => c.month === month)
    .reduce((a, c) => a + c.amount, 0)
}

export const isActiveOn = (e: Enrollment, date = today()) => e.startDate <= date && (!e.endDate || e.endDate >= date)
export const overlapsMonth = (e: Enrollment, month: string) =>
  e.startDate <= monthEnd(month) && (!e.endDate || e.endDate >= monthStart(month))
