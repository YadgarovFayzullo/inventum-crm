import { useEffect, useMemo, useState } from 'react'
import { today } from '@/lib/dates'
import { formatPhone, fullName } from '@/lib/format'
import { useStore } from '@/store/store'
import { Avatar, Button, DatePicker, Icon, Input, Modal, toast } from '@/ui'

/** Добавить существующих учеников в группу */
export function EnrollModal({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const students = useStore((s) => s.students)
  const enrollments = useStore((s) => s.enrollments)
  const enroll = useStore((s) => s.enroll)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [date, setDate] = useState(today())

  useEffect(() => {
    if (open) { setQ(''); setPicked([]); setDate(today()) }
  }, [open])

  const inGroup = useMemo(() => new Set(enrollments.filter((e) => e.groupId === groupId && !e.endDate).map((e) => e.studentId)), [enrollments, groupId])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return students
      .filter((s) => s.status !== 'left' && !inGroup.has(s.id))
      .filter((s) => !t || fullName(s).toLowerCase().includes(t) || s.phone.includes(t.replace(/\D/g, '') || '@'))
      .slice(0, 50)
  }, [students, inGroup, q])

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const submit = () => {
    picked.forEach((id) => enroll(id, groupId, date))
    toast(`Добавлено: ${picked.length}`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить учеников в группу"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button disabled={!picked.length} onClick={submit}>Добавить {picked.length > 0 && `(${picked.length})`}</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <Input icon="search" placeholder="Поиск по имени или телефону" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <DatePicker value={date} onChange={setDate} />
      </div>
      <div className="-mx-2 max-h-80 overflow-y-auto">
        {list.length === 0 && <p className="py-8 text-center text-muted">Никого не найдено</p>}
        {list.map((s) => {
          const on = picked.includes(s.id)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-canvas"
            >
              <Avatar seed={s.id} photoVersion={s.photoVersion} name={fullName(s)} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{fullName(s)}</span>
                <span className="block text-xs text-subtle">{formatPhone(s.phone)}</span>
              </span>
              <span className={`inline-flex size-5.5 items-center justify-center rounded-md border ${on ? 'border-primary bg-primary text-white' : 'border-line-strong'}`}>
                {on && <Icon name="check" size={14} stroke={2.4} />}
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
