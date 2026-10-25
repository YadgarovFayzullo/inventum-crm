import { useCallback, useState } from 'react'
import { addMonths, formatMonth } from '@/lib/dates'
import { IconButton, MonthPicker } from '@/ui'

/** Стрелки листают месяцы; клик по названию открывает календарь выбора месяца и года */
export function MonthSwitcher({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const close = useCallback(() => setAnchor(null), [])
  return (
    <div className="inline-flex h-10 items-center gap-1 rounded-full border border-line bg-surface px-1">
      <IconButton icon="chevronLeft" label="Предыдущий месяц" size="sm" onClick={() => onChange(addMonths(value, -1))} />
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget.getBoundingClientRect())}
        className="h-8 min-w-36 rounded-full px-3 text-center font-medium transition-colors hover:bg-canvas"
      >
        {formatMonth(value)}
      </button>
      <IconButton icon="chevronRight" label="Следующий месяц" size="sm" onClick={() => onChange(addMonths(value, 1))} />
      <MonthPicker anchor={anchor} value={value} onChange={onChange} onClose={close} />
    </div>
  )
}
