import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { describeConflict, findConflicts, normRoom } from '@/lib/conflicts'
import { formatDate, formatDays, isoWeekday, today, WEEKDAYS_SHORT } from '@/lib/dates'
import { formatMoney, fullName } from '@/lib/format'
import { useAccess } from '@/store/auth'
import { useStore } from '@/store/store'
import type { Group } from '@/store/types'
import { Button, Chips, DatePicker, Field, Icon, Input, Modal, MoneyInput, Select, Tabs, toast } from '@/ui'

type Form = Omit<Group, 'id' | 'archived'>
/** initial — заготовка для новой группы (например, день и время из клика по сетке расписания) */
type Props = { open: boolean; onClose: () => void; group?: Group; initial?: Partial<Form>; onCreated?: (id: string) => void }

const blank = (): Form => ({ name: '', courseId: '', teacherId: '', days: [1, 3, 5], timeStart: '09:00', timeEnd: '10:30', room: '', price: 0, capacity: 12, startDate: today(), online: false, meetingUrl: undefined })
const URL_RE = /^https?:\/\/\S+$/i

/** Сдвинуть расписание так, чтобы первым днём недели стал день старта: Пн-Ср-Пт + старт во вторник → Вт-Чт-Сб */
const shiftDays = (days: number[], startWeekday: number) => {
  if (!days.length) return [startWeekday]
  const delta = startWeekday - Math.min(...days)
  return days.map((d) => ((((d - 1 + delta) % 7) + 7) % 7) + 1).sort((a, b) => a - b)
}

/** Первое занятие начиная с даты старта (не позже чем через неделю) */
const firstLesson = (start: string, days: number[]) => {
  const d = new Date(`${start}T00:00:00`)
  for (let i = 0; i < 7; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (days.includes(isoWeekday(iso))) return iso
    d.setDate(d.getDate() + 1)
  }
  return start
}

export function GroupFormModal({ open, onClose, group, initial, onCreated }: Props) {
  const courses = useStore((s) => s.courses)
  const teachers = useStore((s) => s.teachers)
  const groups = useStore((s) => s.groups)
  const rooms = useStore((s) => s.settings.rooms)
  const addGroup = useStore((s) => s.addGroup)
  const updateGroup = useStore((s) => s.updateGroup)
  const updateSettings = useStore((s) => s.updateSettings)
  const canSettings = useAccess().can('settings')
  const [f, setF] = useState<Form>(blank)
  // пока дни не выбирали вручную, они подстраиваются под дату старта
  const [daysTouched, setDaysTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setDaysTouched(!!group || !!initial?.days)
    if (group) return setF({ ...group })
    // один кабинет в центре — подставляем его сразу
    const start = initial?.days?.length && !initial.startDate ? firstLesson(today(), initial.days) : undefined
    // клик по сетке расписания: старт — ближайший такой день, а не сегодня
    setF({ ...blank(), room: rooms.length === 1 ? rooms[0]! : '', ...initial, ...(start ? { startDate: start } : {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const timeOk = f.timeStart < f.timeEnd
  const conflicts = useMemo(
    // онлайн-группа не занимает кабинет
    () => findConflicts({ ...f, room: f.online ? '' : f.room, id: group?.id ?? '', archived: group?.archived ?? false }, groups),
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
  const course = courses.find((c) => c.id === f.courseId)
  const urlOk = !f.meetingUrl || URL_RE.test(f.meetingUrl.trim())
  const placeOk = f.online ? urlOk : !!f.room.trim()
  const valid = f.name.trim() && f.courseId && f.teacherId && f.days.length > 0 && f.price > 0 && placeOk && timeOk && conflicts.length === 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const data: Form = f.online
      ? { ...f, room: '', meetingUrl: f.meetingUrl?.trim() || undefined }
      : { ...f, room: f.room.trim(), meetingUrl: undefined }
    // новый кабинет, введённый прямо в форме, запоминаем в настройках (их меняет только владелец)
    if (!data.online && canSettings && !rooms.some((r) => normRoom(r) === normRoom(data.room))) updateSettings({ rooms: [...rooms, data.room] })
    if (group) {
      updateGroup(group.id, data)
      toast('Группа сохранена')
    } else {
      const id = addGroup(data)
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
            // цена идёт за курсом, пока её не поменяли вручную
            setF((p) => {
              const prev = courses.find((x) => x.id === p.courseId)
              const followsCourse = !p.price || p.price === prev?.price
              return { ...p, courseId: v, price: followsCourse ? c?.price ?? 0 : p.price }
            })
          }}
        />
        <Select label="Преподаватель" value={f.teacherId} placeholder="Выберите" options={teachers.map((t) => ({ value: t.id, label: fullName(t) }))} onChange={(v) => set('teacherId', v)} />
        <Field label="Формат" className="sm:col-span-2">
          <div>
            <Tabs
              value={f.online ? 'online' : 'offline'}
              onChange={(v) => set('online', v === 'online')}
              tabs={[{ value: 'offline', label: 'В центре' }, { value: 'online', label: 'Онлайн' }]}
            />
          </div>
        </Field>
        <Field label="Дни занятий" className="sm:col-span-2">
          <Chips options={WEEKDAYS_SHORT.map((label, i) => ({ value: i + 1, label }))} value={f.days} onChange={(v) => { setDaysTouched(true); set('days', v) }} />
        </Field>
        <Input label="Начало" type="time" value={f.timeStart} onChange={(e) => set('timeStart', e.target.value)} />
        <Input label="Конец" type="time" value={f.timeEnd} onChange={(e) => set('timeEnd', e.target.value)} error={timeOk ? undefined : 'Конец должен быть позже начала'} />
        <MoneyInput
          label="Цена в месяц"
          value={f.price}
          onChange={(v) => set('price', v)}
          hint={course ? (f.price === course.price ? 'Как у курса. Измените, если для этой группы цена другая' : `У курса ${formatMoney(course.price)}`) : 'Подставится из курса'}
        />
        {f.online ? (
          <Input
            label="Ссылка на урок"
            placeholder="https://meet.google.com/…"
            value={f.meetingUrl ?? ''}
            onChange={(e) => set('meetingUrl', e.target.value)}
            error={urlOk ? undefined : 'Ссылка должна начинаться с https://'}
            hint="Zoom, Google Meet или Telegram — необязательно"
          />
        ) : (
          <Select
            label="Кабинет"
            value={f.room}
            placeholder="Выберите или введите"
            options={roomOptions}
            onChange={(v) => set('room', v)}
            creatable
            hint={canSettings ? 'Новый кабинет сохранится в Настройках' : undefined}
          />
        )}
        <Input label="Мест в группе" type="number" min={1} value={f.capacity} onChange={(e) => set('capacity', Number(e.target.value))} />
        <DatePicker
          label="Дата старта"
          value={f.startDate}
          onChange={(v) => setF((p) => ({ ...p, startDate: v, days: daysTouched ? p.days : shiftDays(p.days, isoWeekday(v)) }))}
        />
        {f.days.length > 0 && !f.days.includes(isoWeekday(f.startDate)) && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 p-3.5 text-[13px] sm:col-span-2">
            <Icon name="info" size={18} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              Старт — {WEEKDAYS_SHORT[isoWeekday(f.startDate) - 1]}, а занятия по {formatDays(f.days)}. Первое занятие будет {formatDate(firstLesson(f.startDate, f.days))}.
            </span>
            <Button size="sm" variant="secondary" onClick={() => set('days', shiftDays(f.days, isoWeekday(f.startDate)))}>
              Сдвинуть на {formatDays(shiftDays(f.days, isoWeekday(f.startDate)))}
            </Button>
          </div>
        )}
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
