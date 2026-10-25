import { useEffect, useMemo, useState } from 'react'
import { currentMonth, formatMonth } from '@/lib/dates'
import { formatMoney, formatPhone, fullName, phoneHref } from '@/lib/format'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { useAccess } from '@/store/auth'
import { enrollmentsOf, useEnrollmentsByGroup } from '@/store/hooks'
import { useStore } from '@/store/store'
import type { Teacher } from '@/store/types'
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Input, Modal, PageHeader, PhoneInput, Table, toast, type Column } from '@/ui'

function TeacherModal({ open, onClose, teacher }: { open: boolean; onClose: () => void; teacher?: Teacher }) {
  const { addTeacher, updateTeacher } = useStore.getState()
  const blank = { firstName: '', lastName: '', phone: '', subject: '', salaryPercent: 40 }
  const [f, setF] = useState(blank)
  useEffect(() => {
    if (open) setF(teacher ? { ...teacher } : blank)
  }, [open, teacher])
  const valid = f.firstName.trim() && f.lastName.trim()
  const submit = () => {
    if (teacher) updateTeacher(teacher.id, f)
    else addTeacher(f)
    toast(teacher ? 'Сохранено' : 'Преподаватель добавлен')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={teacher ? 'Редактировать преподавателя' : 'Новый преподаватель'} footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button disabled={!valid} onClick={submit}>Сохранить</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Имя" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} autoFocus />
        <Input label="Фамилия" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        <PhoneInput label="Телефон" value={f.phone} onChange={(phone) => setF({ ...f, phone })} />
        <Input label="Предмет" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
        <Input label="Процент от оплат" type="number" min={0} max={100} suffix="%" value={f.salaryPercent} onChange={(e) => setF({ ...f, salaryPercent: Number(e.target.value) })} hint="Зарплата = % от оплат учеников его групп за месяц" />
      </div>
    </Modal>
  )
}

export default function Teachers() {
  const teachers = useStore((s) => s.teachers)
  const groups = useStore((s) => s.groups)
  const payments = useStore((s) => s.payments)
  const deleteTeacher = useStore((s) => s.deleteTeacher)
  const byGroup = useEnrollmentsByGroup()
  const salary = useAccess().can('teachers.manage')
  const [month, setMonth] = useState(currentMonth())
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | undefined>()
  const [toDelete, setToDelete] = useState<Teacher | null>(null)

  const stats = useMemo(() => {
    const groupTeacher = new Map(groups.map((g) => [g.id, g.teacherId]))
    const m = new Map<string, { groups: number; students: number; income: number }>()
    for (const t of teachers) m.set(t.id, { groups: 0, students: 0, income: 0 })
    for (const g of groups) {
      if (g.archived) continue
      const s = m.get(g.teacherId)
      if (!s) continue
      s.groups++
      s.students += enrollmentsOf(byGroup, g.id).filter((e) => !e.endDate).length
    }
    for (const p of payments) {
      if (!p.date.startsWith(month)) continue
      const s = m.get(groupTeacher.get(p.groupId) ?? '')
      if (s) s.income += p.amount
    }
    return m
  }, [teachers, groups, payments, byGroup, month])

  const columns: Column<Teacher>[] = [
    {
      key: 'name',
      header: 'Преподаватель',
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar name={fullName(t)} tone="dark" />
          <div>
            <div className="font-medium">{fullName(t)}</div>
            <a href={phoneHref(t.phone)} className="text-xs text-subtle hover:text-primary">{formatPhone(t.phone)}</a>
          </div>
        </div>
      ),
    },
    { key: 'subject', header: 'Предмет', render: (t) => <Badge tone="outline">{t.subject || '—'}</Badge> },
    { key: 'groups', header: 'Групп', align: 'center', render: (t) => stats.get(t.id)?.groups ?? 0 },
    { key: 'students', header: 'Учеников', align: 'center', render: (t) => stats.get(t.id)?.students ?? 0 },
    ...(salary ? [
      { key: 'income', header: 'Оплаты групп', align: 'right' as const, render: (t: Teacher) => formatMoney(stats.get(t.id)?.income ?? 0) },
      {
        key: 'salary',
        header: 'Зарплата',
        align: 'right' as const,
        render: (t: Teacher) => (
          <div>
            <div className="font-medium">{formatMoney(((stats.get(t.id)?.income ?? 0) * t.salaryPercent) / 100)}</div>
            <div className="text-xs text-subtle">{t.salaryPercent}%</div>
          </div>
        ),
      },
      {
        key: 'x',
        header: '',
        align: 'right' as const,
        render: (t: Teacher) => (
          <div className="flex justify-end gap-1">
            <IconButton icon="edit" size="sm" label="Изменить" onClick={() => { setEditing(t); setOpen(true) }} />
            <IconButton icon="trash" size="sm" label="Удалить" onClick={() => setToDelete(t)} />
          </div>
        ),
      },
    ] : []),
  ]

  return (
    <>
      <PageHeader
        title="Преподаватели"
        subtitle={salary ? `Зарплата за ${formatMonth(month).toLowerCase()} считается от фактических оплат` : 'Преподаватели и их группы'}
        actions={salary ? <><MonthSwitcher value={month} onChange={setMonth} /><Button icon="userPlus" onClick={() => { setEditing(undefined); setOpen(true) }}>Добавить</Button></> : undefined}
      />
      <Card padded={false}>
        <Table columns={columns} rows={teachers} rowKey={(t) => t.id} empty={<EmptyState icon="graduation" title="Преподавателей нет" />} />
      </Card>
      <TeacherModal open={open} onClose={() => setOpen(false)} teacher={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Удалить преподавателя?"
        text={toDelete && (stats.get(toDelete.id)?.groups ?? 0) > 0 ? 'У преподавателя есть активные группы — назначьте им другого преподавателя.' : undefined}
        onConfirm={() => { deleteTeacher(toDelete!.id); toast('Удалено') }}
      />
    </>
  )
}
