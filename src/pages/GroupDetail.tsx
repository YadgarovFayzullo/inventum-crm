import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { describeConflict, findConflicts } from '@/lib/conflicts'
import { currentMonth, formatDate, formatDays, today } from '@/lib/dates'
import { formatMoney, formatPhone, fullName, phoneHref } from '@/lib/format'
import { AttendanceGrid, MarkLegend } from '@/components/AttendanceGrid'
import { ConvertLeadModal } from '@/components/ConvertLeadModal'
import { EnrollModal } from '@/components/EnrollModal'
import { GroupFormModal } from '@/components/GroupFormModal'
import { Balance } from '@/components/Money'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { PaymentFormModal } from '@/components/PaymentFormModal'
import { StudentFormModal } from '@/components/StudentFormModal'
import { TransferModal } from '@/components/TransferModal'
import { useAccess } from '@/store/auth'
import { monthCharge } from '@/store/billing'
import { enrollmentsOf, useBalances, useCourseMap, useEnrollmentsByGroup, useStudentMap, useTeacherMap } from '@/store/hooks'
import { LEAD_STATUS, TIME_SLOT_SHORT } from '@/store/labels'
import { isOpenLead, seatsOf, useSeats } from '@/store/seats'
import { useStore } from '@/store/store'
import type { Enrollment, Lead } from '@/store/types'
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Icon, IconButton, Table, Tabs, toast, type Column } from '@/ui'

export default function GroupDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const group = useStore((s) => s.groups.find((g) => g.id === id))
  const enrollments = useStore((s) => s.enrollments)
  const payments = useStore((s) => s.payments)
  const allLeads = useStore((s) => s.leads)
  const { updateGroup, deleteGroup, unenroll } = useStore.getState()
  const { can, ownsGroup } = useAccess()
  const money = can('payments')
  const manage = can('students.manage')
  const manageGroup = can('groups.manage')
  const seeLeads = can('leads')
  const seats = useSeats()
  const byGroup = useEnrollmentsByGroup()
  const studentMap = useStudentMap()
  const courseMap = useCourseMap()
  const teacherMap = useTeacherMap()
  const { byPair } = useBalances()

  const [tab, setTab] = useState<'attendance' | 'students' | 'leads'>('attendance')
  const [converting, setConverting] = useState<Lead | null>(null)
  const [month, setMonth] = useState(currentMonth())
  const [editOpen, setEditOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [paySid, setPaySid] = useState<string | null>(null)
  const [transferSid, setTransferSid] = useState<string | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const active = useMemo(
    () =>
      enrollmentsOf(byGroup, id)
        .filter((e) => !e.endDate && studentMap.has(e.studentId))
        .sort((a, b) => fullName(studentMap.get(a.studentId)!).localeCompare(fullName(studentMap.get(b.studentId)!))),
    [byGroup, id, studentMap],
  )

  /** Открытые заявки, которые ведём в эту группу */
  const leads = useMemo(() => allLeads.filter((l) => l.groupId === id && isOpenLead(l)), [allLeads, id])

  const monthPaid = useMemo(() => {
    const cm = currentMonth()
    const m = new Map<string, number>()
    for (const p of payments) if (p.groupId === id && p.date.startsWith(cm)) m.set(p.studentId, (m.get(p.studentId) ?? 0) + p.amount)
    return m
  }, [payments, id])

  if (!group || !ownsGroup(group)) return <EmptyState icon="layers" title={group ? 'Нет доступа' : 'Группа не найдена'} text={group ? 'Это группа другого преподавателя.' : undefined} action={<Button onClick={() => navigate('/groups')}>К группам</Button>} />

  const teacher = teacherMap.get(group.teacherId)
  const st = seatsOf(seats, id)

  const leadColumns: Column<Lead>[] = [
    { key: 'name', header: 'Заявка', render: (l) => <div><div className="font-medium">{l.name}</div><div className="text-xs text-subtle">от {formatDate(l.createdAt)} · {l.source}</div></div> },
    { key: 'phone', header: 'Телефон', render: (l) => <a href={phoneHref(l.phone)} className="hover:text-primary">{formatPhone(l.phone)}</a> },
    { key: 'status', header: 'Этап', render: (l) => <Badge tone={l.status === 'new' ? 'orange' : 'soft'}>{LEAD_STATUS[l.status]}</Badge> },
    {
      key: 'wish',
      header: 'Удобно',
      render: (l) => [l.preferredDays?.length ? formatDays(l.preferredDays) : '', l.preferredSlot ? TIME_SLOT_SHORT[l.preferredSlot] : ''].filter(Boolean).join(' · ') || '—',
    },
    ...(manage ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (l: Lead) => <Button size="sm" variant="soft" disabled={st.full} onClick={() => setConverting(l)}>В ученики</Button>,
    }] : []),
  ]
  const totalDebt = active.reduce((a, e) => a + Math.min(0, byPair.get(`${e.studentId}|${id}`)?.balance ?? 0), 0)

  const columns: Column<Enrollment>[] = [
    {
      key: 'name',
      header: 'Ученик',
      render: (e) => {
        const s = studentMap.get(e.studentId)!
        return (
          <Link to={`/students/${s.id}`} className="flex items-center gap-3 hover:text-primary">
            <Avatar seed={s.id} photoVersion={s.photoVersion} name={fullName(s)} size={32} />
            <div className="min-w-0">
              <div className="truncate font-medium">{fullName(s)}</div>
              <div className="text-xs text-subtle">в группе с {formatDate(e.startDate)}</div>
            </div>
          </Link>
        )
      },
    },
    { key: 'phone', header: 'Телефон', render: (e) => formatPhone(studentMap.get(e.studentId)!.phone) || '—' },
    {
      key: 'parent',
      header: 'Родитель',
      render: (e) => {
        const s = studentMap.get(e.studentId)!
        return <div><div>{s.parentName || '—'}</div><div className="text-xs text-subtle">{formatPhone(s.parentPhone)}</div></div>
      },
    },
    ...(money ? [{
      key: 'month',
      header: 'Этот месяц',
      render: (e: Enrollment) => {
        const s = studentMap.get(e.studentId)!
        const due = monthCharge(enrollments, s.id, group, s.discount)
        const paid = monthPaid.get(s.id) ?? 0
        return paid >= due ? <Badge tone="dark">Оплачено</Badge> : paid > 0 ? <Badge tone="soft">Частично</Badge> : <Badge tone="outline">Не оплачено</Badge>
      },
    }, { key: 'balance', header: 'Баланс', align: 'right' as const, render: (e: Enrollment) => <Balance value={byPair.get(`${e.studentId}|${id}`)?.balance ?? 0} /> }] : []),
    ...(manage ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (e: Enrollment) => (
        <div className="flex justify-end gap-1">
          {money && <IconButton icon="wallet" label="Оплата" size="sm" variant="soft" onClick={() => setPaySid(e.studentId)} />}
          <IconButton icon="transfer" label="Перевести" size="sm" variant="secondary" onClick={() => setTransferSid(e.studentId)} />
          <IconButton icon="userX" label="Убрать из группы" size="sm" variant="secondary" onClick={() => setRemoveId(e.id)} />
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <Link to="/groups" className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-fg">
        <Icon name="arrowLeft" size={16} /> Группы
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{group.name}</h1>
            {group.archived && <Badge tone="gray">Архив</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-muted">
            <span className="flex items-center gap-1.5"><Icon name="book" size={16} />{courseMap.get(group.courseId)?.name}</span>
            <span className="flex items-center gap-1.5"><Icon name="graduation" size={16} />{teacher ? fullName(teacher) : '—'}</span>
            <span className="flex items-center gap-1.5"><Icon name="calendar" size={16} />{formatDays(group.days)}</span>
            <span className="flex items-center gap-1.5"><Icon name="clock" size={16} />{group.timeStart}–{group.timeEnd}</span>
            <span className="flex items-center gap-1.5"><Icon name="door" size={16} />Каб. {group.room || '—'}</span>
          </div>
        </div>
        {manageGroup && <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>Изменить</Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (group.archived) {
                const [c] = findConflicts({ ...group, archived: false }, useStore.getState().groups)
                if (c) return toast(`Нельзя восстановить. ${describeConflict(c, teacherMap.has(c.group.teacherId) ? fullName(teacherMap.get(c.group.teacherId)!) : undefined)}. Сначала измените время или кабинет`, 'error')
              }
              updateGroup(id, { archived: !group.archived })
              toast(group.archived ? 'Группа восстановлена' : 'Группа в архиве')
            }}
          >
            {group.archived ? 'Из архива' : 'В архив'}
          </Button>
          <IconButton icon="trash" label="Удалить группу" variant="secondary" onClick={() => setConfirmDelete(true)} />
        </div>}
      </div>

      <div className={`mb-4 grid gap-4 ${money ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
        <Card><div className="text-[13px] text-muted">Учеников</div><div className="mt-1 text-2xl font-semibold">{active.length}<span className="text-base text-subtle"> / {group.capacity}</span></div>{seeLeads && <div className="mt-0.5 text-[13px] text-muted">{st.full ? 'Мест нет' : `+${st.reserved} в заявках · свободно ${st.free}`}</div>}</Card>
        {money && <Card><div className="text-[13px] text-muted">Цена в месяц</div><div className="mt-1 text-2xl font-semibold">{formatMoney(group.price)}</div></Card>}
        {money && <Card><div className="text-[13px] text-muted">Долг группы</div><div className={`mt-1 text-2xl font-semibold ${totalDebt < 0 ? 'text-primary' : ''}`}>{formatMoney(-totalDebt)}</div></Card>}
        <Card><div className="text-[13px] text-muted">Старт</div><div className="mt-1 text-2xl font-semibold">{formatDate(group.startDate)}</div></Card>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'attendance', label: 'Посещаемость' },
              { value: 'students', label: 'Ученики', count: active.length },
              ...(seeLeads ? [{ value: 'leads' as const, label: 'Заявки', count: leads.length }] : []),
            ]}
          />
          {tab === 'attendance' ? (
            <MonthSwitcher value={month} onChange={setMonth} />
          ) : tab === 'leads' ? null : manage ? (
            <div className="flex gap-2">
              <Button variant="secondary" icon="userPlus" onClick={() => setNewOpen(true)}>Новый ученик</Button>
              <Button icon="plus" onClick={() => setEnrollOpen(true)}>Добавить из базы</Button>
            </div>
          ) : null}
        </div>
        {tab === 'attendance' ? (
          <>
            <div className="px-5 pb-4"><MarkLegend /></div>
            <div className="pb-3"><AttendanceGrid group={group} month={month} /></div>
          </>
        ) : tab === 'leads' ? (
          <Table
            columns={leadColumns}
            rows={leads}
            rowKey={(l) => l.id}
            empty={<EmptyState icon="users" title="Заявок в эту группу нет" text="Выберите группу в карточке лида на странице «Лиды»." action={<Button variant="secondary" onClick={() => navigate('/leads')}>К лидам</Button>} />}
          />
        ) : (
          <Table columns={columns} rows={active} rowKey={(e) => e.id} empty={<EmptyState icon="users" title="В группе пока никого" action={manage ? <Button icon="plus" onClick={() => setEnrollOpen(true)}>Добавить учеников</Button> : undefined} />} />
        )}
      </Card>

      <ConvertLeadModal lead={converting} onClose={() => setConverting(null)} />
      <GroupFormModal open={editOpen} onClose={() => setEditOpen(false)} group={group} />
      <EnrollModal open={enrollOpen} onClose={() => setEnrollOpen(false)} groupId={id} />
      <StudentFormModal open={newOpen} onClose={() => setNewOpen(false)} defaultGroupId={id} />
      <PaymentFormModal open={paySid !== null} onClose={() => setPaySid(null)} studentId={paySid ?? undefined} groupId={id} />
      {transferSid && <TransferModal open onClose={() => setTransferSid(null)} studentId={transferSid} fromGroupId={id} />}
      <ConfirmDialog
        open={removeId !== null}
        onClose={() => setRemoveId(null)}
        title="Убрать ученика из группы?"
        text="Начисления прекратятся с сегодняшнего дня. Для смены группы лучше используйте «Перевести»."
        confirmLabel="Убрать"
        onConfirm={() => { unenroll(removeId!, today()); toast('Ученик убран из группы') }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Удалить группу?"
        text="Будут удалены записи учеников в эту группу и посещаемость. Оплаты сохранятся. Обычно достаточно отправить группу в архив."
        onConfirm={() => { deleteGroup(id); toast('Группа удалена'); navigate('/groups') }}
      />
    </>
  )
}
