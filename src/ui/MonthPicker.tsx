import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { currentMonth } from '@/lib/dates'
import { Icon } from './icons'

type MonthPickerProps = {
  /** Прямоугольник элемента, к которому привязан календарь; null — закрыт */
  anchor: DOMRect | null
  /** 'YYYY-MM' */
  value: string
  onChange: (month: string) => void
  onClose: () => void
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const WIDTH = 288
const GAP = 6
const PAD = 8

/** Календарь выбора месяца и года — как в системных календарях: стрелки меняют год, клик по году открывает список лет. */
export function MonthPicker({ anchor, value, onChange, onClose }: MonthPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [year, setYear] = useState(Number(value.slice(0, 4)))
  const [years, setYears] = useState(false)

  useEffect(() => {
    if (anchor) {
      setYear(Number(value.slice(0, 4)))
      setYears(false)
    }
  }, [anchor, value])

  useLayoutEffect(() => {
    if (!anchor || !ref.current) {
      setPos(null)
      return
    }
    const h = ref.current.offsetHeight
    const top = anchor.bottom + GAP + h > window.innerHeight - PAD ? Math.max(PAD, anchor.top - GAP - h) : anchor.bottom + GAP
    const left = Math.min(Math.max(PAD, anchor.left + anchor.width / 2 - WIDTH / 2), window.innerWidth - WIDTH - PAD)
    setPos({ top, left })
  }, [anchor, years])

  useEffect(() => {
    if (!anchor) return
    ref.current?.focus({ preventScroll: true })
    const outside = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', outside)
    window.addEventListener('scroll', outside, true)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('mousedown', outside)
      window.removeEventListener('scroll', outside, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  if (!anchor) return null

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      onClose()
    }
  }
  const pick = (m: string) => {
    onChange(m)
    onClose()
  }
  const first = year - (year % 12)
  const cm = currentMonth()
  const arrow = 'inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-fg'

  return createPortal(
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label="Выбор месяца"
      onKeyDown={onKey}
      style={{ width: WIDTH, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      className="fixed z-150 animate-fade rounded-2xl border border-line bg-surface p-3 shadow-lg outline-none"
    >
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Назад" className={arrow} onClick={() => setYear((y) => y - (years ? 12 : 1))}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <button
          type="button"
          onClick={() => setYears((v) => !v)}
          className="inline-flex h-8 items-center gap-1 rounded-full px-3 font-medium transition-colors hover:bg-canvas"
        >
          {years ? `${first} – ${first + 11}` : year}
          <Icon name="chevronDown" size={14} className={cn('text-subtle transition-transform', years && 'rotate-180')} />
        </button>
        <button type="button" aria-label="Вперёд" className={arrow} onClick={() => setYear((y) => y + (years ? 12 : 1))}>
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      {years ? (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => first + i).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setYear(y)
                setYears(false)
              }}
              className={cn('h-11 rounded-xl transition-colors', y === year ? 'bg-primary font-medium text-white' : 'hover:bg-canvas')}
            >
              {y}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {MONTHS.map((m, i) => {
              const key = `${year}-${String(i + 1).padStart(2, '0')}`
              const active = key === value
              const isNow = key === cm
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pick(key)}
                  className={cn(
                    'h-11 rounded-xl transition-colors',
                    active ? 'bg-primary font-medium text-white' : isNow ? 'border border-primary font-medium text-primary hover:bg-primary-soft' : 'hover:bg-canvas',
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>
          <div className="mt-2 border-t border-line pt-2">
            <button type="button" onClick={() => pick(cm)} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary-soft">
              Текущий месяц
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
