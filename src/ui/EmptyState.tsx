import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'

export function EmptyState({ icon = 'search', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
      <span className="mb-1.5 inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-[15px] font-medium">{title}</p>
      {text && <p className="mb-2.5 max-w-85 text-muted">{text}</p>}
      {action}
    </div>
  )
}
