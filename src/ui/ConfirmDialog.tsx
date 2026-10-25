import { Button } from './Button'
import { Modal } from './Modal'

type ConfirmProps = {
  open: boolean
  title: string
  text?: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, text, confirmLabel = 'Удалить', onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button variant="dark" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
        </>
      }
    >
      {text && <p className="text-muted">{text}</p>}
    </Modal>
  )
}
