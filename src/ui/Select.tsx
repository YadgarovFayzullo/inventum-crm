import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { Icon } from './icons'

export type Option = { value: string; label: string; hint?: string }

type SelectProps = {
  value?: string
  onChange?: (value: string) => void
  options: Option[]
  label?: string
  hint?: string
  error?: string
  /** Текст, когда ничего не выбрано. Если задан — в списке есть пункт «сбросить» с этим текстом. */
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Поиск включается автоматически, если пунктов больше этого числа */
  searchFrom?: number
}

const GAP = 6
const PAD = 8
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

export function Select({ value = '', onChange, options, label, hint, error, placeholder, disabled, className, searchFrom = 6 }: SelectProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hl, setHl] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selected = options.find((o) => o.value === value)
  const searchable = options.length > searchFrom

  const items = useMemo(() => {
    const all: Option[] = placeholder !== undefined ? [{ value: '', label: placeholder }, ...options] : options
    const t = norm(q)
    return t ? all.filter((o) => o.value !== '' && norm(o.label).includes(t)) : all
  }, [options, placeholder, q])

  const close = (focusTrigger = true) => {
    setOpen(false)
    setQ('')
    if (focusTrigger) triggerRef.current?.focus()
  }
  const pick = (o: Option) => {
    onChange?.(o.value)
    close()
  }
  const openMenu = () => {
    if (disabled) return
    setHl(Math.max(0, items.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  // Позиция: под полем, при нехватке места — над ним
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const width = Math.max(r.width, 220)
    const h = popRef.current.offsetHeight
    const top = r.bottom + GAP + h > window.innerHeight - PAD ? Math.max(PAD, r.top - GAP - h) : r.bottom + GAP
    const left = Math.min(r.left, window.innerWidth - width - PAD)
    setPos({ top, left, width })
  }, [open, items.length])

  useEffect(() => {
    if (!open) return
    ;(searchable ? searchRef.current : listRef.current)?.focus({ preventScroll: true })
    const outside = (e: Event) => {
      const t = e.target as Node
      if (!popRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false)
    }
    window.addEventListener('mousedown', outside)
    window.addEventListener('scroll', outside, true)
    window.addEventListener('resize', () => close(false), { once: true })
    return () => {
      window.removeEventListener('mousedown', outside)
      window.removeEventListener('scroll', outside, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${hl}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [hl, open])

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const d = e.key === 'ArrowDown' ? 1 : -1
      setHl((i) => (items.length ? (i + d + items.length) % items.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = items[hl]
      if (o) pick(o)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      // не даём Esc закрыть модалку, в которой лежит селект
      e.stopPropagation()
      e.preventDefault()
      close()
    }
  }

  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            openMenu()
          }
        }}
        className={cn(
          'flex h-10.5 w-full items-center gap-2 rounded-xl border bg-surface px-3.5 text-left transition-[border-color,box-shadow]',
          'border-line-strong enabled:hover:border-subtle disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted',
          open && 'border-primary ring-3 ring-primary-soft',
          error && 'border-primary',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-subtle')}>{selected?.label ?? placeholder ?? 'Выберите'}</span>
        <Icon name="chevronDown" size={16} className={cn('shrink-0 text-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width }}
            className="fixed z-150 flex animate-fade flex-col rounded-2xl border border-line bg-surface p-1.5 shadow-lg"
          >
            {searchable && (
              <div className="mb-1.5 flex h-9.5 items-center gap-2 rounded-xl bg-canvas px-3">
                <Icon name="search" size={16} className="shrink-0 text-subtle" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value)
                    setHl(0)
                  }}
                  onKeyDown={onListKey}
                  placeholder="Поиск"
                  className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle"
                />
                {q && (
                  <button type="button" aria-label="Очистить" onClick={() => setQ('')} className="text-subtle hover:text-fg">
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            )}
            <div ref={listRef} role="listbox" tabIndex={-1} onKeyDown={onListKey} className="max-h-64 overflow-y-auto outline-none">
              {items.length === 0 && <div className="px-3 py-6 text-center text-[13px] text-muted">Ничего не найдено</div>}
              {items.map((o, i) => {
                const active = o.value === value
                return (
                  <button
                    key={o.value || '__empty'}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-i={i}
                    tabIndex={-1}
                    onMouseEnter={() => setHl(i)}
                    onClick={() => pick(o)}
                    className={cn(
                      'flex h-9.5 w-full items-center gap-2.5 rounded-xl px-3 text-left transition-colors',
                      i === hl && 'bg-canvas',
                      active && 'bg-primary-soft text-primary-active',
                      o.value === '' && !active && 'text-muted',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-xs text-subtle">{o.hint}</span>}
                    {active && <Icon name="check" size={16} className="shrink-0 text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </Field>
  )
}
