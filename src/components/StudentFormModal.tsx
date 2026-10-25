import { useEffect, useState, type FormEvent } from 'react'
import { useStore } from '@/store/store'
import type { Student } from '@/store/types'
import { LEAD_SOURCES } from '@/store/labels'
import { Button, DatePicker, Input, Modal, PhoneInput, Select, Textarea, toast } from '@/ui'

type Props = { open: boolean; onClose: () => void; student?: Student; defaultGroupId?: string; onCreated?: (id: string) => void }

const blank = { firstName: '', lastName: '', phone: '', parentName: '', parentPhone: '', birthDate: '', source: '', note: '', discount: 0 }

export function StudentFormModal({ open, onClose, student, defaultGroupId, onCreated }: Props) {
  const groups = useStore((s) => s.groups)
  const addStudent = useStore((s) => s.addStudent)
  const updateStudent = useStore((s) => s.updateStudent)
  const [f, setF] = useState(blank)
  const [groupId, setGroupId] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setTouched(false)
    setGroupId(defaultGroupId ?? '')
    setF(student ? { ...blank, ...student, birthDate: student.birthDate ?? '', source: student.source ?? '', note: student.note ?? '' } : blank)
  }, [open, student, defaultGroupId])

  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((p) => ({ ...p, [k]: v }))
  const errors = {
    firstName: !f.firstName.trim() ? 'Введите имя' : '',
    lastName: !f.lastName.trim() ? 'Введите фамилию' : '',
    phone: f.phone && f.phone.length < 9 ? 'Неполный номер' : '',
    parentPhone: f.parentPhone && f.parentPhone.length < 9 ? 'Неполный номер' : '',
  }
  const invalid = Object.values(errors).some(Boolean)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    const data = { ...f, firstName: f.firstName.trim(), lastName: f.lastName.trim(), birthDate: f.birthDate || undefined, discount: Number(f.discount) || 0 }
    if (student) {
      updateStudent(student.id, data)
      toast('Данные ученика сохранены')
    } else {
      const id = addStudent({ ...data, status: 'active' }, groupId || undefined)
      toast('Ученик добавлен')
      onCreated?.(id)
    }
    onClose()
  }

  const err = (k: keyof typeof errors) => (touched ? errors[k] : '')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? 'Редактировать ученика' : 'Новый ученик'}
      width={600}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" form="student-form">{student ? 'Сохранить' : 'Добавить'}</Button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Имя" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={err('firstName')} autoFocus />
        <Input label="Фамилия" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} error={err('lastName')} />
        <PhoneInput label="Телефон ученика" value={f.phone} onChange={(v) => set('phone', v)} error={err('phone')} />
        <DatePicker label="Дата рождения" clearable value={f.birthDate} onChange={(v) => set('birthDate', v)} />
        <Input label="Имя родителя" icon="user" value={f.parentName} onChange={(e) => set('parentName', e.target.value)} />
        <PhoneInput label="Телефон родителя" value={f.parentPhone} onChange={(v) => set('parentPhone', v)} error={err('parentPhone')} />
        <Select label="Откуда узнал" value={f.source} onChange={(v) => set('source', v)} placeholder="—" options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />
        <Input label="Скидка" type="number" min={0} max={100} suffix="%" value={f.discount} onChange={(e) => set('discount', Math.min(100, Math.max(0, Number(e.target.value))))} />
        {!student && (
          <Select
            className="sm:col-span-2"
            label="Записать в группу"
            value={groupId}
            onChange={setGroupId}
            placeholder="Без группы"
            options={groups.filter((g) => !g.archived).map((g) => ({ value: g.id, label: g.name }))}
          />
        )}
        <Textarea className="sm:col-span-2" label="Заметка" value={f.note} onChange={(e) => set('note', e.target.value)} />
      </form>
    </Modal>
  )
}
