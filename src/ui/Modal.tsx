import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({ open, onClose, title, description, children, footer, width = 520 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-100 flex animate-fade items-start justify-center overflow-y-auto bg-overlay px-4 pt-[8vh] pb-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full animate-rise rounded-[20px] bg-surface shadow-lg" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <header className="flex items-start justify-between gap-4 pt-5.5 pr-5.5 pl-6">
          <div>
            <h2 className="text-lg leading-tight">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          </div>
          <IconButton icon="close" label="Закрыть" onClick={onClose} />
        </header>
        <div className="flex flex-col gap-4 px-6 pt-5 pb-6">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
