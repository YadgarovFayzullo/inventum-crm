import { useEffect, useState } from 'react'
import { formatMoney } from '@/lib/format'
import { useStore } from '@/store/store'
import type { Course } from '@/store/types'
import { Button, ConfirmDialog, EmptyState, Icon, IconButton, Input, Modal, MoneyInput, PageHeader, Textarea, toast } from '@/ui'

function CourseModal({ open, onClose, course }: { open: boolean; onClose: () => void; course?: Course }) {
  const { addCourse, updateCourse } = useStore.getState()
  const [f, setF] = useState({ name: '', price: 0, durationMonths: 6, description: '' })
  useEffect(() => {
    if (open) setF(course ? { ...course, description: course.description ?? '' } : { name: '', price: 0, durationMonths: 6, description: '' })
  }, [open, course])
  const valid = f.name.trim() && f.price > 0
  const submit = () => {
    if (course) updateCourse(course.id, f)
    else addCourse(f)
    toast('Курс сохранён')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={course ? 'Редактировать курс' : 'Новый курс'} footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button disabled={!valid} onClick={submit}>Сохранить</Button></>}>
      <Input label="Название" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyInput label="Цена в месяц" value={f.price} onChange={(price) => setF({ ...f, price })} />
        <Input label="Длительность" type="number" min={1} suffix="мес" value={f.durationMonths} onChange={(e) => setF({ ...f, durationMonths: Number(e.target.value) })} />
      </div>
      <Textarea label="Описание" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
    </Modal>
  )
}

export default function Courses() {
  const courses = useStore((s) => s.courses)
  const groups = useStore((s) => s.groups)
  const deleteCourse = useStore((s) => s.deleteCourse)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Course | undefined>()
  const [toDelete, setToDelete] = useState<Course | null>(null)

  return (
    <>
      <PageHeader title="Курсы" subtitle="Направления обучения и базовые цены" actions={<Button icon="plus" onClick={() => { setEditing(undefined); setOpen(true) }}>Новый курс</Button>} />
      {courses.length === 0 ? (
        <EmptyState icon="book" title="Курсов нет" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const n = groups.filter((g) => g.courseId === c.id && !g.archived).length
            return (
              <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="book" size={22} /></span>
                  <div className="flex gap-1">
                    <IconButton icon="edit" size="sm" label="Изменить" onClick={() => { setEditing(c); setOpen(true) }} />
                    <IconButton icon="trash" size="sm" label="Удалить" onClick={() => setToDelete(c)} />
                  </div>
                </div>
                <div>
                  <div className="text-[17px] font-medium">{c.name}</div>
                  {c.description && <p className="mt-1 text-[13px] text-muted">{c.description}</p>}
                </div>
                <div className="mt-auto flex items-end justify-between border-t border-line pt-3">
                  <div>
                    <div className="text-lg font-medium">{formatMoney(c.price)}</div>
                    <div className="text-xs text-subtle">в месяц · {c.durationMonths} мес</div>
                  </div>
                  <span className="text-[13px] text-muted">{n} групп</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <CourseModal open={open} onClose={() => setOpen(false)} course={editing} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} title="Удалить курс?" text="Группы этого курса останутся, но потеряют привязку к курсу." onConfirm={() => { deleteCourse(toDelete!.id); toast('Курс удалён') }} />
    </>
  )
}
