const moneyFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export const formatMoney = (n: number) => `${moneyFmt.format(Math.round(n))} сум`
export const formatNumber = (n: number) => moneyFmt.format(Math.round(n))

/** 9 цифр → +998 90 123 45 67 (частичный ввод тоже форматируется) */
export function formatPhone(d: string) {
  if (!d) return ''
  const p = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean)
  return `+998 ${p.join(' ')}`
}

export const phoneHref = (d: string) => `tel:+998${d}`

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim()

export const pluralRu = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
