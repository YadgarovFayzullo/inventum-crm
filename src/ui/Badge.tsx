import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'orange' | 'soft' | 'dark' | 'gray' | 'outline' | 'green' | 'red'

const tones: Record<BadgeTone, string> = {
  orange: 'border-transparent bg-primary text-white',
  soft: 'border-transparent bg-primary-soft text-primary-active',
  dark: 'border-transparent bg-ink text-white',
  gray: 'border-transparent bg-canvas text-muted',
  green: 'border-transparent bg-success-soft text-success',
  red: 'border-transparent bg-danger-soft text-danger',
  outline: 'bg-transparent text-muted border-line-strong',
}

export function Badge({ tone = 'gray', children, dot }: { tone?: BadgeTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium', tones[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
