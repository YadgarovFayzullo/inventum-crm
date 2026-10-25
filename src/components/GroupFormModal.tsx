import { useEffect, useState, type FormEvent } from 'react'
import { today, WEEKDAYS_SHORT } from '@/lib/dates'
import { fullName } from '@/lib/format'
import { useStore } from '@/store/store'
import type { Group } from '@/store/types'
import { Button, Chips, DatePicker, Field, Input, Modal, MoneyInput, Select, toast } from '@/ui'

type Props = { open: boolean; onClose: () => void; group?: Group; onCreated?: (id: string) => void }

type Form = Omit<Group, 'id' | 'archived'>
const blank = (): Form => ({ name: '', courseId: '', teacherId: '', days: [1, 3, 5], timeStart: '09:00', timeEnd: '10:30', room: '', price: 0, capacity: 12, startDate: today() })

export function GroupFormModal({ open, onClose, group, onCreated }: Props) {
  const courses = useStore((s) => s.courses)
  const teachers = useStore((s) => s.teachers)
  const addGroup = useStore((s) => s.addGroup)
  const updateGroup = useStore((s) => s.updateGroup)
  const [f, setF] = useState<Form>(blank)

  useEffect(() => {
    if (open) setF(group ? { ...group } : blank())
  }, [open, group])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const valid = f.name.trim() && f.courseId && f.teacherId && f.days.length > 0 && f.price > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    if (group) {
      updateGroup(group.id, f)
      toast('Группа сохранена')
    } else {
      const id = addGroup(f)
      toast('Группа создана')
      onCreated?.(id)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? 'Редактировать группу' : 'Новая группа'}
      width={600}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" form="group-form" disabled={!valid}>{group ? 'Сохранить' : 'Создать'}</Button>
        </>
      }
    >
      <form id="group-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Название" placeholder="Например: IELTS Evening" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        <Select
          label="Курс"
          value={f.courseId}
          placeholder="Выберите курс"
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => {
            const c = courses.find((x) => x.id === v)
            setF((p) => ({ ...p, courseId: v, price: p.price || c?.price || 0 }))
          }}
        />
        <Select label="Преподаватель" value={f.teacherId} placeholder="Выберите" options={teachers.map((t) => ({ value: t.id, label: fullName(t) }))} onChange={(v) => set('teacherId', v)} />
        <Field label="Дни занятий" className="sm:col-span-2">
          <Chips options={WEEKDAYS_SHORT.map((label, i) => ({ value: i + 1, label }))} value={f.days} onChange={(v) => set('days', v)} />
        </Field>
        <Input label="Начало" type="time" value={f.timeStart} onChange={(e) => set('timeStart', e.target.value)} />
        <Input label="Конец" type="time" value={f.timeEnd} onChange={(e) => set('timeEnd', e.target.value)} />
        <MoneyInput label="Цена в месяц" value={f.price} onChange={(v) => set('price', v)} />
        <Input label="Кабинет" icon="door" value={f.room} onChange={(e) => set('room', e.target.value)} />
        <Input label="Мест в группе" type="number" min={1} value={f.capacity} onChange={(e) => set('capacity', Number(e.target.value))} />
        <DatePicker label="Дата старта" value={f.startDate} onChange={(v) => set('startDate', v)} />
      </form>
    </Modal>
  )
}
