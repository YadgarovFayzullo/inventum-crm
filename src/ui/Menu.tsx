import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Icon } from './icons'

export type MenuItem = {
  key: string
  label: string
  icon?: ReactNode
  active?: boolean
  /** Подсказка справа, например горячая клавиша */
  hint?: string
  /** Разделитель над пунктом */
  divider?: boolean
  onSelect: () => void
}

type MenuProps = {
  /** Прямоугольник элемента, к которому привязано меню; null — меню закрыто */
  anchor: DOMRect | null
  items: MenuItem[]
  onClose: () => void
  title?: string
  width?: number
}

const GAP = 6
const PAD = 8

/** Выпадающее меню, привязанное к элементу. Цифры 1–9 выбирают пункт, стрелки и Enter — навигация. */
export function Menu({ anchor, items, onClose, title, width = 220 }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor || !ref.current) {
      setPos(null)
      return
    }
    const h = ref.current.offsetHeight
    const below = anchor.bottom + GAP
    const top = below + h > window.innerHeight - PAD ? Math.max(PAD, anchor.top - GAP - h) : below
    const left = Math.min(Math.max(PAD, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - PAD)
    setPos({ top, left })
  }, [anchor, width])

  useEffect(() => {
    if (!anchor) return
    const buttons = () => [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])]
    const focusIdx = Math.max(0, items.findIndex((i) => i.active))
    buttons()[focusIdx]?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      const n = Number(e.key)
      if (n >= 1 && n <= items.length) {
        e.preventDefault()
        items[n - 1]!.onSelect()
        return onClose()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const list = buttons()
        const i = list.indexOf(document.activeElement as HTMLButtonElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length
        list[next]?.focus()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onScroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, items, onClose])

  if (!anchor) return null
  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ width, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      className="fixed z-150 animate-fade rounded-2xl border border-line bg-surface p-1.5 shadow-lg"
    >
      {title && <div className="px-2.5 pt-1.5 pb-2 text-xs text-subtle">{title}</div>}
      {items.map((item) => (
        <div key={item.key}>
          {item.divider && <div className="mx-1.5 my-1.5 h-px bg-line" />}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              item.onSelect()
              onClose()
            }}
            className={cn(
              'flex h-9.5 w-full items-center gap-2.5 rounded-xl px-2.5 text-left outline-none transition-colors hover:bg-canvas focus-visible:bg-canvas',
              item.active && 'bg-primary-soft hover:bg-primary-soft focus-visible:bg-primary-soft',
            )}
          >
            {item.icon}
            <span className="flex-1 truncate">{item.label}</span>
            {item.active ? <Icon name="check" size={16} className="text-primary" /> : item.hint && <span className="text-xs text-subtle">{item.hint}</span>}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
