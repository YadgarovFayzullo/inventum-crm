import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & { padded?: boolean }

export function Card({ padded = true, className, ...rest }: CardProps) {
  return <div className={cn('min-w-0 rounded-2xl border border-line bg-surface', padded && 'p-5', className)} {...rest} />
}

export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base leading-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
