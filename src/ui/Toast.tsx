import { create } from 'zustand'
import { cn } from '@/lib/cn'
import { Icon } from './icons'

type ToastItem = { id: number; text: string; kind: 'success' | 'error' }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }))

let seq = 0
/** Успех — зелёная галочка, ошибка — оранжевый крестик */
export function toast(text: string, kind: ToastItem['kind'] = 'success') {
  const id = ++seq
  useToasts.setState((st) => ({ items: [...st.items, { id, text, kind }] }))
  setTimeout(() => useToasts.setState((st) => ({ items: st.items.filter((t) => t.id !== id) })), 2600)
}

export function Toaster() {
  const items = useToasts((st) => st.items)
  return (
    <div className="pointer-events-none fixed top-6 left-1/2 z-200 flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="flex animate-drop items-center gap-2.5 rounded-full bg-ink py-2.5 pr-4.5 pl-2.5 font-medium text-white shadow-md">
          <span className={cn('inline-flex size-6 items-center justify-center rounded-full', t.kind === 'success' ? 'bg-success' : 'bg-primary')}>
            <Icon name={t.kind === 'success' ? 'check' : 'close'} size={14} stroke={2.4} />
          </span>
          {t.text}
        </div>
      ))}
    </div>
  )
}
