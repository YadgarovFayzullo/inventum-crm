import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './icons'

type CheckboxProps = { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; className?: string }

export function Checkbox({ checked, onChange, children, className }: CheckboxProps) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5 select-none', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
          checked ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface',
        )}
      >
        {checked && <Icon name="check" size={13} stroke={2.6} />}
      </span>
      {children}
    </label>
  )
}
