import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { describeConflict, findConflicts, normRoom } from '@/lib/conflicts'
import { today, WEEKDAYS_SHORT } from '@/lib/dates'
import { fullName } from '@/lib/format'
import { useStore } from '@/store/store'
import type { Group } from '@/store/types'
import { Button, Chips, DatePicker, Field, Icon, Input, Modal, MoneyInput, Select, toast } from '@/ui'

type Form = Omit<Group, 'id' | 'archived'>
/** initial — заготовка для новой группы (например, день и время из клика по сетке расписания) */
type Props = { open: boolean; onClose: () => void; group?: Group; initial?: Partial<Form>; onCreated?: (id: string) => void }

const blank = (): Form => ({ name: '', courseId: '', teacherId: '', days: [1, 3, 5], timeStart: '09:00', timeEnd: '10:30', room: '', price: 0, capacity: 12, startDate: today() })

export function GroupFormModal({ open, onClose, group, initial, onCreated }: Props) {
  const courses = useStore((s) => s.courses)
  const teachers = useStore((s) => s.teachers)
  const groups = useStore((s) => s.groups)
  const rooms = useStore((s) => s.settings.rooms)
  const addGroup = useStore((s) => s.addGroup)
  const updateGroup = useStore((s) => s.updateGroup)
  const [f, setF] = useState<Form>(blank)

  useEffect(() => {
    if (!open) return
    if (group) return setF({ ...group })
    // один кабинет в центре — подставляем его сразу
    setF({ ...blank(), room: rooms.length === 1 ? rooms[0]! : '', ...initial })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const timeOk = f.timeStart < f.timeEnd
  const conflicts = useMemo(
    () => findConflicts({ ...f, id: group?.id ?? '', archived: group?.archived ?? false }, groups),
    [f, group, groups],
  )
  const teacherName = (id: string) => {
    const t = teachers.find((x) => x.id === id)
    return t ? fullName(t) : undefined
  }
  const roomOptions = useMemo(() => {
    const list = rooms.map((r) => ({ value: r, label: r }))
    // у старой группы может стоять кабинет, которого уже нет в списке
    if (f.room && !rooms.some((r) => normRoom(r) === normRoom(f.room))) list.push({ value: f.room, label: f.room })
    return list
  }, [rooms, f.room])
  const valid = f.name.trim() && f.courseId && f.teacherId && f.days.length > 0 && f.price > 0 && f.room.trim() && timeOk && conflicts.length === 0

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
        <Input label="Конец" type="time" value={f.timeEnd} onChange={(e) => set('timeEnd', e.target.value)} error={timeOk ? undefined : 'Конец должен быть позже начала'} />
        <MoneyInput label="Цена в месяц" value={f.price} onChange={(v) => set('price', v)} />
        {roomOptions.length > 0 ? (
          <Select label="Кабинет" value={f.room} placeholder="Выберите кабинет" options={roomOptions} onChange={(v) => set('room', v)} />
        ) : (
          <Input label="Кабинет" icon="door" value={f.room} onChange={(e) => set('room', e.target.value)} hint="Список кабинетов задаётся в Настройках" />
        )}
        <Input label="Мест в группе" type="number" min={1} value={f.capacity} onChange={(e) => set('capacity', Number(e.target.value))} />
        <DatePicker label="Дата старта" value={f.startDate} onChange={(v) => set('startDate', v)} />
        {conflicts.length > 0 && (
          <div role="alert" className="flex gap-3 rounded-xl border border-primary-soft-2 bg-primary-soft p-3.5 text-[13px] text-primary-active sm:col-span-2">
            <Icon name="info" size={18} className="mt-px shrink-0" />
            <div className="grid gap-1">
              <span className="font-medium">Время пересекается с другими занятиями — выберите другие дни, время или кабинет</span>
              {conflicts.map((c) => <span key={c.group.id}>{describeConflict(c, teacherName(c.group.teacherId))}</span>)}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
