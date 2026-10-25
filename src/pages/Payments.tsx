import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { downloadCsv } from '@/lib/csv'
import { currentMonth, formatDate, formatMonth } from '@/lib/dates'
import { formatMoney, formatPhone, fullName, phoneHref } from '@/lib/format'
import { Balance } from '@/components/Money'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { PaymentFormModal } from '@/components/PaymentFormModal'
import { enrollmentsOf, useBalances, useEnrollmentsByStudent, useGroupMap, useStudentMap } from '@/store/hooks'
import { PAYMENT_METHOD } from '@/store/labels'
import { useStore } from '@/store/store'
import type { Payment, PaymentMethod, Student } from '@/store/types'
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Input, PageHeader, Select, StatCard, Table, Tabs, toast, type Column } from '@/ui'

export default function Payments() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'debtors' ? 'debtors' : 'payments'
  const payments = useStore((s) => s.payments)
  const students = useStore((s) => s.students)
  const deletePayment = useStore((s) => s.deletePayment)
  const studentMap = useStudentMap()
  const groupMap = useGroupMap()
  const byStudent = useEnrollmentsByStudent()
  const { byStudent: balances } = useBalances()

  const [month, setMonth] = useState(currentMonth())
  const [method, setMethod] = useState('')
  const [q, setQ] = useState('')
  const query = useDeferredValue(q)
  const [payFor, setPayFor] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<string | null>(null)

  const monthPayments = useMemo(() => {
    const t = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (!p.date.startsWith(month)) return false
      if (method && p.method !== method) return false
      if (!t) return true
      const s = studentMap.get(p.studentId)
      return !!s && fullName(s).toLowerCase().includes(t)
    })
  }, [payments, month, method, query, studentMap])

  const summary = useMemo(() => {
    const byMethod = new Map<PaymentMethod, number>()
    let total = 0
    for (const p of payments) {
      if (!p.date.startsWith(month)) continue
      total += p.amount
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount)
    }
    return { total, byMethod, count: payments.filter((p) => p.date.startsWith(month)).length }
  }, [payments, month])

  const debtors = useMemo(() => {
    const t = query.trim().toLowerCase()
    return students
      .filter((s) => (balances.get(s.id)?.balance ?? 0) < 0)
      .filter((s) => !t || fullName(s).toLowerCase().includes(t))
      .sort((a, b) => balances.get(a.id)!.balance - balances.get(b.id)!.balance)
  }, [students, balances, query])
  const totalDebt = debtors.reduce((a, s) => a - balances.get(s.id)!.balance, 0)

  const paymentColumns: Column<Payment>[] = [
    { key: 'date', header: 'Дата', render: (p) => <span className="whitespace-nowrap">{formatDate(p.date)}</span> },
    {
      key: 'student',
      header: 'Ученик',
      render: (p) => {
        const s = studentMap.get(p.studentId)
        return s ? (
          <button type="button" onClick={() => navigate(`/students/${s.id}`)} className="flex items-center gap-2.5 text-left hover:text-primary">
            <Avatar seed={s.id} name={fullName(s)} size={28} />
            {fullName(s)}
          </button>
        ) : '—'
      },
    },
    { key: 'group', header: 'Группа', render: (p) => groupMap.get(p.groupId)?.name ?? '—' },
    { key: 'method', header: 'Способ', render: (p) => <Badge tone="gray">{PAYMENT_METHOD[p.method]}</Badge> },
    { key: 'comment', header: 'Комментарий', render: (p) => <span className="text-muted">{p.comment ?? ''}</span> },
    { key: 'amount', header: 'Сумма', align: 'right', render: (p) => <span className="font-medium whitespace-nowrap">{formatMoney(p.amount)}</span> },
    { key: 'x', header: '', width: 48, render: (p) => <IconButton icon="trash" size="sm" label="Удалить" onClick={() => setToDelete(p.id)} /> },
  ]

  const debtorColumns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Ученик',
      render: (s) => (
        <button type="button" onClick={() => navigate(`/students/${s.id}`)} className="flex items-center gap-2.5 text-left hover:text-primary">
          <Avatar seed={s.id} name={fullName(s)} size={32} />
          <span className="font-medium">{fullName(s)}</span>
        </button>
      ),
    },
    {
      key: 'phones',
      header: 'Телефоны',
      render: (s) => (
        <div className="text-[13px]">
          {s.phone && <a className="block hover:text-primary" href={phoneHref(s.phone)}>{formatPhone(s.phone)}</a>}
          {s.parentPhone && <a className="block text-muted hover:text-primary" href={phoneHref(s.parentPhone)}>{formatPhone(s.parentPhone)} · родитель</a>}
        </div>
      ),
    },
    {
      key: 'groups',
      header: 'Группы',
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          {enrollmentsOf(byStudent, s.id).filter((e) => !e.endDate).map((e) => <Badge key={e.id} tone="outline">{groupMap.get(e.groupId)?.name}</Badge>)}
        </div>
      ),
    },
    { key: 'debt', header: 'Долг', align: 'right', render: (s) => <Balance value={balances.get(s.id)!.balance} /> },
    { key: 'pay', header: '', align: 'right', render: (s) => <Button size="sm" variant="soft" onClick={() => setPayFor(s.id)}>Принять</Button> },
  ]

  const exportCsv = () =>
    tab === 'payments'
      ? downloadCsv(`оплаты-${month}.csv`, [
          ['Дата', 'Ученик', 'Группа', 'Способ', 'Сумма', 'Комментарий'],
          ...monthPayments.map((p) => {
            const s = studentMap.get(p.studentId)
            return [p.date, s ? fullName(s) : '', groupMap.get(p.groupId)?.name ?? '', PAYMENT_METHOD[p.method], p.amount, p.comment ?? '']
          }),
        ])
      : downloadCsv('должники.csv', [
          ['Ученик', 'Телефон', 'Телефон родителя', 'Долг'],
          ...debtors.map((s) => [fullName(s), formatPhone(s.phone), formatPhone(s.parentPhone), -balances.get(s.id)!.balance]),
        ])

  return (
    <>
      <PageHeader
        title="Оплаты"
        subtitle="Приём оплат, история и должники"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exportCsv}>Экспорт</Button>
            <Button icon="wallet" onClick={() => setPayFor('')}>Принять оплату</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={(v) => setParams(v === 'debtors' ? { tab: v } : {})}
          tabs={[
            { value: 'payments', label: 'История оплат' },
            { value: 'debtors', label: 'Должники', count: students.filter((s) => (balances.get(s.id)?.balance ?? 0) < 0).length },
          ]}
        />
        <Input className="min-w-56 flex-1" icon="search" placeholder="Поиск по ученику" value={q} onChange={(e) => setQ(e.target.value)} />
        {tab === 'payments' && (
          <>
            <Select className="w-44" value={method} onChange={setMethod} placeholder="Все способы" options={Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label }))} />
            <MonthSwitcher value={month} onChange={setMonth} />
          </>
        )}
      </div>

      {tab === 'payments' ? (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard accent icon="coins" label={formatMonth(month)} value={formatMoney(summary.total)} hint={`${summary.count} оплат`} />
            {(['cash', 'payme', 'click'] as PaymentMethod[]).map((m) => (
              <StatCard key={m} icon={m === 'cash' ? 'money' : 'card'} label={PAYMENT_METHOD[m]} value={formatMoney(summary.byMethod.get(m) ?? 0)} />
            ))}
          </div>
          <Card padded={false}>
            <Table columns={paymentColumns} rows={monthPayments} rowKey={(p) => p.id} empty={<EmptyState icon="wallet" title="Оплат за этот период нет" />} />
          </Card>
        </>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard accent icon="wallet" label="Общий долг" value={formatMoney(totalDebt)} hint={`${debtors.length} учеников`} />
          </div>
          <Card padded={false}>
            <Table columns={debtorColumns} rows={debtors} rowKey={(s) => s.id} empty={<EmptyState icon="check" title="Должников нет" />} />
          </Card>
        </>
      )}

      <PaymentFormModal open={payFor !== null} onClose={() => setPayFor(null)} studentId={payFor || undefined} />
      <ConfirmDialog open={toDelete !== null} onClose={() => setToDelete(null)} title="Удалить оплату?" text="Баланс ученика будет пересчитан." onConfirm={() => { deletePayment(toDelete!); toast('Оплата удалена') }} />
    </>
  )
}
