import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { downloadCsv } from '@/lib/csv'
import { formatPhone, fullName } from '@/lib/format'
import { Balance } from '@/components/Money'
import { StudentFormModal } from '@/components/StudentFormModal'
import { useAccess } from '@/store/auth'
import { enrollmentsOf, useBalances, useEnrollmentsByStudent, useGroupMap } from '@/store/hooks'
import { STUDENT_STATUS } from '@/store/labels'
import { useStore } from '@/store/store'
import type { Student, StudentStatus } from '@/store/types'
import { Avatar, Badge, Button, Card, EmptyState, Input, PageHeader, Select, Table, Tabs, type Column } from '@/ui'

type Filter = 'all' | StudentStatus | 'debt'

export default function Students() {
  const navigate = useNavigate()
  const students = useStore((s) => s.students)
  const groups = useStore((s) => s.groups)
  const groupMap = useGroupMap()
  const { can, ownsGroup } = useAccess()
  const money = can('payments')
  const manage = can('students.manage')
  const byStudent = useEnrollmentsByStudent()
  const { byStudent: balances } = useBalances()
  const [q, setQ] = useState('')
  const query = useDeferredValue(q)
  const [filter, setFilter] = useState<Filter>('active')
  const [groupId, setGroupId] = useState('')
  const [open, setOpen] = useState(false)

  const activeGroups = (id: string) => enrollmentsOf(byStudent, id).filter((e) => !e.endDate).map((e) => e.groupId)
  const balanceOf = (id: string) => balances.get(id)?.balance ?? 0

  // Преподаватель видит только учеников своих групп
  const visibleGroups = useMemo(() => groups.filter(ownsGroup), [groups, ownsGroup])
  const scoped = useMemo(() => {
    if (manage) return students
    const ids = new Set(visibleGroups.map((g) => g.id))
    return students.filter((s) => enrollmentsOf(byStudent, s.id).some((e) => !e.endDate && ids.has(e.groupId)))
  }, [students, manage, visibleGroups, byStudent])

  const counts = useMemo(() => {
    const c = { all: scoped.length, active: 0, frozen: 0, left: 0, debt: 0 }
    for (const s of scoped) {
      c[s.status]++
      if ((balances.get(s.id)?.balance ?? 0) < 0) c.debt++
    }
    return c
  }, [students, balances])

  const rows = useMemo(() => {
    const t = query.trim().toLowerCase()
    const digits = t.replace(/\D/g, '')
    return scoped.filter((s) => {
      if (filter === 'debt' ? balanceOf(s.id) >= 0 : filter !== 'all' && s.status !== filter) return false
      if (groupId && !activeGroups(s.id).includes(groupId)) return false
      if (!t) return true
      return (
        fullName(s).toLowerCase().includes(t) ||
        `${s.lastName} ${s.firstName}`.toLowerCase().includes(t) ||
        s.parentName.toLowerCase().includes(t) ||
        (digits.length >= 2 && (s.phone.includes(digits) || s.parentPhone.includes(digits)))
      )
    })
  }, [scoped, query, filter, groupId, balances, byStudent])

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Ученик',
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar seed={s.id} name={fullName(s)} />
          <div className="min-w-0">
            <div className="truncate font-medium">{fullName(s)}</div>
            <div className="text-xs text-subtle">{formatPhone(s.phone) || 'нет телефона'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'parent',
      header: 'Родитель',
      render: (s) => (
        <div className="min-w-0">
          <div className="truncate">{s.parentName || '—'}</div>
          <div className="text-xs text-subtle">{formatPhone(s.parentPhone)}</div>
        </div>
      ),
    },
    {
      key: 'groups',
      header: 'Группы',
      render: (s) => {
        const g = activeGroups(s.id)
        return g.length ? (
          <div className="flex flex-wrap gap-1">{g.map((id) => <Badge key={id} tone="outline">{groupMap.get(id)?.name}</Badge>)}</div>
        ) : (
          <span className="text-subtle">—</span>
        )
      },
    },
    { key: 'status', header: 'Статус', render: (s) => <Badge tone={STUDENT_STATUS[s.status].tone} dot>{STUDENT_STATUS[s.status].label}</Badge> },
    ...(money ? [{ key: 'balance', header: 'Баланс', align: 'right' as const, render: (s: Student) => <Balance value={balanceOf(s.id)} /> }] : []),
  ]

  const exportCsv = () =>
    downloadCsv('ученики.csv', [
      ['Фамилия', 'Имя', 'Телефон', 'Родитель', 'Телефон родителя', 'Группы', 'Статус', 'Баланс'],
      ...rows.map((s) => [
        s.lastName, s.firstName, formatPhone(s.phone), s.parentName, formatPhone(s.parentPhone),
        activeGroups(s.id).map((id) => groupMap.get(id)?.name).join(', '), STUDENT_STATUS[s.status].label, balanceOf(s.id),
      ]),
    ])

  return (
    <>
      <PageHeader
        title="Ученики"
        subtitle={manage ? `${counts.active} активных из ${counts.all}` : `${counts.active} в ваших группах`}
        actions={
          manage ? (
            <>
              <Button variant="secondary" icon="download" onClick={exportCsv}>Экспорт</Button>
              <Button icon="userPlus" onClick={() => setOpen(true)}>Новый ученик</Button>
            </>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'active', label: 'Активные', count: counts.active },
            ...(money ? [{ value: 'debt' as const, label: 'Должники', count: counts.debt }] : []),
            { value: 'frozen', label: 'Заморожены', count: counts.frozen },
            ...(manage ? [{ value: 'left' as const, label: 'Ушли', count: counts.left }] : []),
            { value: 'all', label: 'Все', count: counts.all },
          ]}
        />
        <Input className="min-w-60 flex-1" icon="search" placeholder="Имя, родитель или телефон" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="w-56" value={groupId} onChange={setGroupId} placeholder="Все группы" options={visibleGroups.map((g) => ({ value: g.id, label: g.name }))} />
      </div>
      <Card padded={false}>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          onRowClick={(s) => navigate(`/students/${s.id}`)}
          empty={<EmptyState icon="users" title="Ученики не найдены" text={manage ? 'Измените фильтры или добавьте нового ученика.' : 'Измените фильтры.'} action={manage ? <Button icon="plus" onClick={() => setOpen(true)}>Добавить</Button> : undefined} />}
        />
      </Card>
      <StudentFormModal open={open} onClose={() => setOpen(false)} onCreated={(id) => navigate(`/students/${id}`)} />
    </>
  )
}
