import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { today } from '@/lib/dates'
import { formatMoney, fullName } from '@/lib/format'
import { computeBalances, monthCharge } from '@/store/billing'
import { useStore } from '@/store/store'
import { PAYMENT_METHOD } from '@/store/labels'
import type { PaymentMethod } from '@/store/types'
import { Button, DatePicker, Input, Modal, MoneyInput, Select, toast } from '@/ui'

type Props = { open: boolean; onClose: () => void; studentId?: string; groupId?: string }

export function PaymentFormModal({ open, onClose, studentId, groupId }: Props) {
  const students = useStore((s) => s.students)
  const groups = useStore((s) => s.groups)
  const enrollments = useStore((s) => s.enrollments)
  const payments = useStore((s) => s.payments)
  const addPayment = useStore((s) => s.addPayment)

  const [sid, setSid] = useState('')
  const [gid, setGid] = useState('')
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [date, setDate] = useState(today())
  const [comment, setComment] = useState('')

  const studentGroups = useMemo(() => {
    const ids = new Set(enrollments.filter((e) => e.studentId === sid).map((e) => e.groupId))
    return groups.filter((g) => ids.has(g.id))
  }, [sid, enrollments, groups])

  // Подсказка суммы: долг по группе либо платёж за текущий месяц
  const suggest = (s: string, g: string) => {
    const group = groups.find((x) => x.id === g)
    const st = students.find((x) => x.id === s)
    if (!group || !st) return 0
    const debt = -(computeBalances(students, groups, enrollments, payments).byPair.get(`${s}|${g}`)?.balance ?? 0)
    const v = debt > 0 ? debt : monthCharge(enrollments, s, group, st.discount)
    return Math.max(0, v)
  }

  useEffect(() => {
    if (!open) return
    const s = studentId ?? ''
    const g = groupId ?? enrollments.find((e) => e.studentId === s && !e.endDate)?.groupId ?? ''
    setSid(s)
    setGid(g)
    setAmount(suggest(s, g))
    setMethod('cash')
    setDate(today())
    setComment('')
  }, [open])

  const value = amount
  const valid = sid && gid && value > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    addPayment({ studentId: sid, groupId: gid, amount: value, method, date, comment: comment || undefined })
    toast(`Оплата ${formatMoney(value)} принята`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Принять оплату"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" form="payment-form" disabled={!valid}>Принять</Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Select
          className="sm:col-span-2"
          label="Ученик"
          value={sid}
          disabled={!!studentId}
          onChange={(s) => {
            const g = enrollments.find((x) => x.studentId === s && !x.endDate)?.groupId ?? ''
            setSid(s)
            setGid(g)
            setAmount(suggest(s, g))
          }}
          placeholder="Выберите ученика"
          options={[...students].sort((a, b) => fullName(a).localeCompare(fullName(b))).map((s) => ({ value: s.id, label: fullName(s) }))}
        />
        <Select
          className="sm:col-span-2"
          label="Группа"
          value={gid}
          onChange={(v) => {
            setGid(v)
            setAmount(suggest(sid, v))
          }}
          placeholder="Выберите группу"
          options={studentGroups.map((g) => ({ value: g.id, label: g.name }))}
        />
        <MoneyInput label="Сумма" value={amount} onChange={setAmount} autoFocus />
        <Select label="Способ" value={method} onChange={(v) => setMethod(v as PaymentMethod)} options={Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label }))} />
        <DatePicker label="Дата" value={date} onChange={setDate} />
        <Input label="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} />
      </form>
    </Modal>
  )
}
