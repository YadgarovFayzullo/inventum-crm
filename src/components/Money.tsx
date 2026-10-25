import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

/** Баланс: долг — оранжевым, переплата/ноль — нейтрально */
export function Balance({ value, className }: { value: number; className?: string }) {
  if (value < 0) return <span className={cn('font-medium whitespace-nowrap text-primary', className)}>−{formatMoney(-value)}</span>
  if (value > 0) return <span className={cn('whitespace-nowrap text-fg', className)}>+{formatMoney(value)}</span>
  return <span className={cn('whitespace-nowrap text-subtle', className)}>0 сум</span>
}
