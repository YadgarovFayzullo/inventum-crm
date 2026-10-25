import { cn } from '@/lib/cn'

type Tab<T extends string> = { value: T; label: string; count?: number }

/** Сегментированные табы-таблетки, как в навигации Telegram-канала бренда */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Tab<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-line bg-surface p-1" role="tablist">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'inline-flex h-8.5 items-center gap-1.5 whitespace-nowrap rounded-full px-4 font-medium transition-colors',
              active ? 'bg-ink text-white' : 'text-muted hover:text-fg',
            )}
            onClick={() => onChange(t.value)}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('h-5 min-w-5 rounded-full px-1.5 text-[11px] leading-5', active ? 'bg-primary text-white' : 'bg-canvas text-muted')}>
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
