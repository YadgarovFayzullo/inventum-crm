import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './icons'

type StatCardProps = { label: string; value: ReactNode; hint?: ReactNode; icon: IconName; accent?: boolean }

export function StatCard({ label, value, hint, icon, accent }: StatCardProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl border px-5 py-4.5', accent ? 'border-primary bg-primary text-white' : 'border-line bg-surface')}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[13px]', accent ? 'text-white/80' : 'text-muted')}>{label}</span>
        <span className={cn('inline-flex size-8.5 items-center justify-center rounded-full', accent ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary')}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="truncate text-[26px] leading-tight font-bold tracking-tight">{value}</div>
      {hint && <div className={cn('text-xs', accent ? 'text-white/80' : 'text-subtle')}>{hint}</div>}
    </div>
  )
}
