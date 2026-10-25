import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDate, formatDays, today } from '@/lib/dates'
import { formatMoney, formatPhone, fullName, phoneHref } from '@/lib/format'
import { AttendanceCalendar } from '@/components/AttendanceCalendar'
import { Balance } from '@/components/Money'
import { PaymentFormModal } from '@/components/PaymentFormModal'
import { StudentFormModal } from '@/components/StudentFormModal'
import { TransferModal } from '@/components/TransferModal'
import { useAccess } from '@/store/auth'
import { EMPTY_BALANCE, enrollmentsOf, useBalances, useEnrollmentsByStudent, useGroupMap, useTeacherMap } from '@/store/hooks'
import { PAYMENT_METHOD, STUDENT_STATUS } from '@/store/labels'
import { useStore } from '@/store/store'
import type { AttendanceMark, Payment, StudentStatus } from '@/store/types'
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Icon, IconButton, Modal, Select, Table, Tabs, toast, type Column, type IconName } from '@/ui'

function InfoRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-subtle"><Icon name={icon} size={18} /></span>
      <div className="min-w-0">
        <div className="text-xs text-subtle">{label}</div>
        <div className="break-words">{children}</div>
      </div>
    </div>
  )
}

export default function StudentDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const student = useStore((s) => s.students.find((x) => x.id === id))
  const allPayments = useStore((s) => s.payments)
  const transfers = useStore((s) => s.transfers)
  const attendance = useStore((s) => s.attendance)
  const groups = useStore((s) => s.groups)
  const { can, ownsGroup } = useAccess()
  const money = can('payments')
  const manage = can('students.manage')
  const { updateStudent, unenroll, enroll, deletePayment } = useStore.getState()
  const groupMap = useGroupMap()
  const teacherMap = useTeacherMap()
  const byStudent = useEnrollmentsByStudent()
  const { byStudent: balances, byPair } = useBalances()

  const [tab, setTab] = useState<'payments' | 'attendance' | 'history'>(money ? 'payments' : 'attendance')
  const [editOpen, setEditOpen] = useState(false)
  const [payGroup, setPayGroup] = useState<string | null>(null)
  const [transferFrom, setTransferFrom] = useState<string | null>(null)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollGroup, setEnrollGroup] = useState('')
  const [removeEnrollment, setRemoveEnrollment] = useState<string | null>(null)

  const enrollments = enrollmentsOf(byStudent, id)
  const active = enrollments.filter((e) => !e.endDate)
  const past = enrollments.filter((e) => e.endDate)
  const payments = useMemo(() => allPayments.filter((p) => p.studentId === id), [allPayments, id])
  const myTransfers = useMemo(() => transfers.filter((t) => t.studentId === id), [transfers, id])

  const marks = useMemo(() => {
    const list: { groupId: string; date: string; mark: AttendanceMark }[] = []
    const counts: Record<AttendanceMark, number> = { present: 0, absent: 0, late: 0, excused: 0 }
    const suffix = `|${id}`
    for (const k in attendance) {
      if (!k.endsWith(suffix)) continue
      const [groupId, date] = k.split('|') as [string, string]
      const mark = attendance[k]!
      counts[mark]++
      list.push({ groupId, date, mark })
    }
    list.sort((a, b) => (a.date < b.date ? 1 : -1))
    return { list, counts, total: list.length }
  }, [attendance, id])

  if (!student) return <EmptyState icon="user" title="Ученик не найден" action={<Button onClick={() => navigate('/students')}>К списку</Button>} />
  // Преподаватель открывает только учеников своих групп
  if (!manage && !enrollments.some((e) => { const g = groupMap.get(e.groupId); return !!g && ownsGroup(g) })) {
    return <EmptyState icon="userX" title="Нет доступа" text="Этот ученик не занимается в ваших группах." action={<Button onClick={() => navigate('/students')}>К списку</Button>} />
  }

  const bal = balances.get(id) ?? EMPTY_BALANCE
  const name = fullName(student)

  const paymentColumns: Column<Payment>[] = [
    { key: 'date', header: 'Дата', render: (p) => formatDate(p.date) },
    { key: 'group', header: 'Группа', render: (p) => groupMap.get(p.groupId)?.name ?? '—' },
    { key: 'method', header: 'Способ', render: (p) => <Badge tone="gray">{PAYMENT_METHOD[p.method]}</Badge> },
    { key: 'comment', header: 'Комментарий', render: (p) => <span className="text-muted">{p.comment ?? ''}</span> },
    { key: 'amount', header: 'Сумма', align: 'right', render: (p) => <span className="font-medium">{formatMoney(p.amount)}</span> },
    {
      key: 'x',
      header: '',
      width: 48,
      render: (p) => <IconButton icon="trash" size="sm" label="Удалить оплату" onClick={() => { deletePayment(p.id); toast('Оплата удалена') }} />,
    },
  ]

  const enrollableGroups = groups.filter((g) => !g.archived && !active.some((e) => e.groupId === g.id))

  return (
    <>
      <Link to="/students" className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-fg">
        <Icon name="arrowLeft" size={16} /> Ученики
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar seed={student.id} name={name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={STUDENT_STATUS[student.status].tone} dot>{STUDENT_STATUS[student.status].label}</Badge>
            {student.discount > 0 && <Badge tone="outline">Скидка {student.discount}%</Badge>}
            <span className="text-[13px] text-subtle">с {formatDate(student.createdAt)}</span>
          </div>
        </div>
        {manage && <div className="flex flex-wrap gap-2">
          <Select
            className="w-44"
            value={student.status}
            onChange={(v) => { updateStudent(id, { status: v as StudentStatus }); toast('Статус обновлён') }}
            options={Object.entries(STUDENT_STATUS).map(([value, v]) => ({ value, label: v.label }))}
          />
          <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>Изменить</Button>
          {money && <Button icon="wallet" onClick={() => setPayGroup(active[0]?.groupId ?? '')} disabled={!enrollments.length}>Принять оплату</Button>}
        </div>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          {money && <div className={bal.balance < 0 ? 'rounded-2xl border border-primary bg-primary p-5 text-white' : 'rounded-2xl border border-line bg-surface p-5'}>
            <div className={bal.balance < 0 ? 'text-[13px] text-white/80' : 'text-[13px] text-muted'}>{bal.balance < 0 ? 'Долг' : 'Баланс'}</div>
            <div className="mt-1 text-[28px] leading-tight font-bold tracking-tight">
              {bal.balance < 0 ? formatMoney(-bal.balance) : formatMoney(bal.balance)}
            </div>
            <div className={`mt-3 grid grid-cols-2 gap-2 text-[13px] ${bal.balance < 0 ? 'text-white/80' : 'text-muted'}`}>
              <div>Начислено<div className={bal.balance < 0 ? 'text-white' : 'text-fg'}>{formatMoney(bal.charged)}</div></div>
              <div>Оплачено<div className={bal.balance < 0 ? 'text-white' : 'text-fg'}>{formatMoney(bal.paid)}</div></div>
            </div>
          </div>}

          <Card>
            <CardHeader title="Контакты" />
            <div className="-my-2.5 divide-y divide-line">
              <InfoRow icon="phone" label="Телефон ученика">
                {student.phone ? <a href={phoneHref(student.phone)} className="hover:text-primary">{formatPhone(student.phone)}</a> : '—'}
              </InfoRow>
              <InfoRow icon="user" label="Родитель">
                <div>{student.parentName || '—'}</div>
                {student.parentPhone && <a href={phoneHref(student.parentPhone)} className="text-muted hover:text-primary">{formatPhone(student.parentPhone)}</a>}
              </InfoRow>
              <InfoRow icon="calendar" label="Дата рождения">{student.birthDate ? formatDate(student.birthDate) : '—'}</InfoRow>
              <InfoRow icon="target" label="Источник">{student.source || '—'}</InfoRow>
              {student.note && <InfoRow icon="message" label="Заметка">{student.note}</InfoRow>}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader
              title="Группы"
              subtitle={active.length ? `${active.length} активных` : 'Не записан в группы'}
              actions={manage ? <Button size="sm" variant="secondary" icon="plus" onClick={() => { setEnrollGroup(''); setEnrollOpen(true) }}>Записать</Button> : undefined}
            />
            {active.length === 0 ? (
              <EmptyState icon="layers" title="Нет активных групп" text="Запишите ученика в группу, чтобы начать начисления и посещаемость." />
            ) : (
              <div className="flex flex-col gap-2">
                {active.map((e) => {
                  const g = groupMap.get(e.groupId)
                  if (!g) return null
                  const t = teacherMap.get(g.teacherId)
                  return (
                    <div key={e.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line px-4 py-3">
                      <Link to={`/groups/${g.id}`} className="min-w-0 flex-1 hover:text-primary">
                        <div className="font-medium">{g.name}</div>
                        <div className="text-[13px] text-muted">
                          {formatDays(g.days)} · {g.timeStart}–{g.timeEnd} · {t ? fullName(t) : '—'} · с {formatDate(e.startDate)}
                        </div>
                      </Link>
                      {money && <Balance value={byPair.get(`${id}|${g.id}`)?.balance ?? 0} />}
                      {manage && (
                        <div className="flex gap-1">
                          {money && <IconButton icon="wallet" label="Оплата" variant="soft" size="sm" onClick={() => setPayGroup(g.id)} />}
                          <IconButton icon="transfer" label="Перевести" size="sm" variant="secondary" onClick={() => setTransferFrom(g.id)} />
                          <IconButton icon="userX" label="Убрать из группы" size="sm" variant="secondary" onClick={() => setRemoveEnrollment(e.id)} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  ...(money ? [{ value: 'payments' as const, label: 'Оплаты', count: payments.length }] : []),
                  { value: 'attendance', label: 'Посещаемость', count: marks.total },
                  { value: 'history', label: 'История', count: myTransfers.length + past.length },
                ]}
              />
            </div>

            {money && tab === 'payments' && (
              <Table columns={paymentColumns} rows={payments} rowKey={(p) => p.id} empty={<EmptyState icon="wallet" title="Оплат пока нет" />} />
            )}

            {tab === 'attendance' && <AttendanceCalendar studentId={id} />}

            {tab === 'history' && (
              <div className="px-5 pb-5">
                {myTransfers.length + past.length === 0 && <EmptyState icon="clock" title="История пуста" />}
                <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
                  {myTransfers.map((t) => (
                    <li key={t.id} className="relative">
                      <span className="absolute top-1 -left-[27px] inline-flex size-3.5 rounded-full border-2 border-surface bg-primary" />
                      <div className="text-[13px] text-subtle">{formatDate(t.date)}</div>
                      <div>
                        Перевод: <span className="font-medium">{groupMap.get(t.fromGroupId)?.name ?? '—'}</span> → <span className="font-medium">{groupMap.get(t.toGroupId)?.name ?? '—'}</span>
                      </div>
                      {t.reason && <div className="text-[13px] text-muted">{t.reason}</div>}
                    </li>
                  ))}
                  {past.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute top-1 -left-[27px] inline-flex size-3.5 rounded-full border-2 border-surface bg-line-strong" />
                      <div className="text-[13px] text-subtle">{formatDate(e.startDate)} — {formatDate(e.endDate!)}</div>
                      <div>Занимался в группе <span className="font-medium">{groupMap.get(e.groupId)?.name ?? '—'}</span></div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
        </div>
      </div>

      <StudentFormModal open={editOpen} onClose={() => setEditOpen(false)} student={student} />
      <PaymentFormModal open={payGroup !== null} onClose={() => setPayGroup(null)} studentId={id} groupId={payGroup || undefined} />
      {transferFrom && <TransferModal open onClose={() => setTransferFrom(null)} studentId={id} fromGroupId={transferFrom} />}
      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Записать в группу"
        width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEnrollOpen(false)}>Отмена</Button>
            <Button disabled={!enrollGroup} onClick={() => { enroll(id, enrollGroup, today()); toast('Записан в группу'); setEnrollOpen(false) }}>Записать</Button>
          </>
        }
      >
        <Select label="Группа" value={enrollGroup} onChange={setEnrollGroup} placeholder="Выберите группу" options={enrollableGroups.map((g) => ({ value: g.id, label: `${g.name} · ${formatMoney(g.price)}` }))} />
      </Modal>
      <ConfirmDialog
        open={removeEnrollment !== null}
        onClose={() => setRemoveEnrollment(null)}
        title="Убрать из группы?"
        text="Начисления прекратятся с сегодняшнего дня. История оплат и посещаемости сохранится."
        confirmLabel="Убрать"
        onConfirm={() => { unenroll(removeEnrollment!, today()); toast('Ученик убран из группы') }}
      />
    </>
  )
}
