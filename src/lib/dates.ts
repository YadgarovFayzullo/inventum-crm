// Все даты храним как 'YYYY-MM-DD' в локальном времени — без часовых поясов.

const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toISO(new Date())

export function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export const monthKey = (s: string) => s.slice(0, 7)
export const currentMonth = () => monthKey(today())

export function addMonths(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y!, m! - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function daysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y!, m!, 0).getDate()
}

export const monthStart = (month: string) => `${month}-01`
export const monthEnd = (month: string) => `${month}-${pad(daysInMonth(month))}`

/** ISO день недели: 1 = Пн … 7 = Вс */
export const isoWeekday = (s: string) => ((parseISO(s).getDay() + 6) % 7) + 1

export function addDays(s: string, n: number) {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Кол-во дней между датами включительно */
export function daysBetween(a: string, b: string) {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000) + 1
}

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export function formatMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const name = MONTHS[m! - 1]!
  return `${name[0]!.toUpperCase()}${name.slice(1)} ${y}`
}

export function formatDate(s: string) {
  const d = parseISO(s)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateShort(s: string) {
  const d = parseISO(s)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
}

export const formatDays = (days: number[]) =>
  [...days].sort((a, b) => a - b).map((d) => WEEKDAYS_SHORT[d - 1]).join(', ')
