import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { addMonths, daysInMonth, formatDate, isoWeekday, monthKey, today, WEEKDAYS_SHORT } from '@/lib/dates'
import { Field } from './Field'
import { Icon } from './icons'

type DatePickerProps = {
  /** 'YYYY-MM-DD' или пустая строка */
  value: string
  onChange: (value: string) => void
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  /** Показать кнопку «Очистить» (для необязательных дат) */
  clearable?: boolean
  disabled?: boolean
  className?: string
}

type View = 'days' | 'months' | 'years'

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const WIDTH = 304
const GAP = 6
const PAD = 8

export function DatePicker({ value, onChange, label, hint, error, placeholder = 'Выберите дату', clearable, disabled, className }: DatePickerProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('days')
  const [month, setMonth] = useState(monthKey(value || today()))
  const [yearPage, setYearPage] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const year = Number(month.slice(0, 4))
  const now = today()

  const close = (focusTrigger = true) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  const openPicker = () => {
    if (disabled) return
    setMonth(monthKey(value || now))
    setView('days')
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const h = popRef.current.offsetHeight
    const top = r.bottom + GAP + h > window.innerHeight - PAD ? Math.max(PAD, r.top - GAP - h) : r.bottom + GAP
    const left = Math.min(Math.max(PAD, r.left), window.innerWidth - WIDTH - PAD)
    setPos({ top, left })
  }, [open, view, month])

  useEffect(() => {
    if (!open) return
    popRef.current?.focus({ preventScroll: true })
    const outside = (e: Event) => {
      const t = e.target as Node
      if (!popRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false)
    }
    const onResize = () => close(false)
    window.addEventListener('mousedown', outside)
    window.addEventListener('scroll', outside, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('mousedown', outside)
      window.removeEventListener('scroll', outside, true)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const days = useMemo(() => {
    const lead = isoWeekday(`${month}-01`) - 1
    return [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(month) }, (_, i) => i + 1)] as (number | null)[]
  }, [month])

  const years = useMemo(() => {
    const start = year - (year % 12) + yearPage * 12
    return Array.from({ length: 12 }, (_, i) => start + i)
  }, [year, yearPage])

  const pick = (iso: string) => {
    onChange(iso)
    close()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // не даём Esc закрыть модалку, в которой лежит календарь
      e.stopPropagation()
      e.preventDefault()
      close()
    }
  }

  const navigate = (dir: -1 | 1) => {
    if (view === 'days') setMonth((m) => addMonths(m, dir))
    else if (view === 'months') setMonth((m) => `${Number(m.slice(0, 4)) + dir}-${m.slice(5)}`)
    else setYearPage((p) => p + dir)
  }

  const title = view === 'days' ? `${MONTHS[Number(month.slice(5)) - 1]} ${year}` : view === 'months' ? String(year) : `${years[0]} – ${years[11]}`

  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPicker())}
        className={cn(
          'flex h-10.5 w-full items-center gap-2 rounded-xl border bg-surface px-3.5 text-left transition-[border-color,box-shadow]',
          'border-line-strong enabled:hover:border-subtle disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted',
          open && 'border-primary ring-3 ring-primary-soft',
          error && 'border-primary',
        )}
      >
        <Icon name="calendar" size={18} className="shrink-0 text-subtle" />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-subtle')}>{value ? formatDate(value) : placeholder}</span>
        {clearable && value && !disabled && (
          <span
            role="button"
            aria-label="Очистить дату"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="shrink-0 rounded-full p-0.5 text-subtle hover:bg-canvas hover:text-fg"
          >
            <Icon name="close" size={14} />
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Календарь"
            onKeyDown={onKey}
            style={{ width: WIDTH, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="fixed z-150 animate-fade rounded-2xl border border-line bg-surface p-3 shadow-lg outline-none"
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                aria-label="Назад"
                onClick={() => navigate(-1)}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-fg"
              >
                <Icon name="chevronLeft" size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setYearPage(0)
                  setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'days')
                }}
                className="inline-flex h-8 items-center gap-1 rounded-full px-3 font-medium transition-colors hover:bg-canvas"
              >
                {title}
                <Icon name="chevronDown" size={14} className={cn('text-subtle transition-transform', view !== 'days' && 'rotate-180')} />
              </button>
              <button
                type="button"
                aria-label="Вперёд"
                onClick={() => navigate(1)}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-fg"
              >
                <Icon name="chevronRight" size={18} />
              </button>
            </div>

            {view === 'days' && (
              <>
                <div className="mb-1 grid grid-cols-7">
                  {WEEKDAYS_SHORT.map((d, i) => (
                    <div key={d} className={cn('py-1.5 text-center text-xs', i >= 5 ? 'text-primary' : 'text-subtle')}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5">
                  {days.map((d, i) => {
                    if (d === null) return <span key={`b${i}`} />
                    const iso = `${month}-${String(d).padStart(2, '0')}`
                    const selected = iso === value
                    const isToday = iso === now
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => pick(iso)}
                        className={cn(
                          'mx-auto inline-flex size-9 items-center justify-center rounded-full transition-colors',
                          selected
                            ? 'bg-primary font-medium text-white'
                            : isToday
                              ? 'border border-primary font-medium text-primary hover:bg-primary-soft'
                              : 'hover:bg-canvas',
                        )}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                  <button type="button" onClick={() => pick(now)} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary-soft">
                    Сегодня
                  </button>
                  {clearable && value && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange('')
                        close()
                      }}
                      className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-canvas hover:text-fg"
                    >
                      Очистить
                    </button>
                  )}
                </div>
              </>
            )}

            {view === 'months' && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {MONTHS_SHORT.map((m, i) => {
                  const active = month === `${year}-${String(i + 1).padStart(2, '0')}`
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMonth(`${year}-${String(i + 1).padStart(2, '0')}`)
                        setView('days')
                      }}
                      className={cn('h-11 rounded-xl transition-colors', active ? 'bg-primary font-medium text-white' : 'hover:bg-canvas')}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            )}

            {view === 'years' && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setMonth(`${y}-${month.slice(5)}`)
                      setView('months')
                    }}
                    className={cn('h-11 rounded-xl transition-colors', y === year ? 'bg-primary font-medium text-white' : 'hover:bg-canvas')}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </Field>
  )
}
