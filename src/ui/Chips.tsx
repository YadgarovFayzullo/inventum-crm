import { cn } from '@/lib/cn'

type ChipsProps<T extends string | number> = {
  options: { value: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
}

/** Мультивыбор таблетками — например, дни недели */
export function Chips<T extends string | number>({ options, value, onChange }: ChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            className={cn(
              'h-9 min-w-11 rounded-full border px-3 font-medium transition-colors',
              on ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface text-muted hover:border-subtle hover:text-fg',
            )}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
