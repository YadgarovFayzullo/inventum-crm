import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { addMonths, currentMonth, formatMonth } from '@/lib/dates'
import { uid } from '@/lib/id'
import { EXPENSE_CATEGORIES, type RecurringExpense } from '@/store/types'
import { Button, Modal, MoneyInput, Select, Textarea, toast } from '@/ui'

type Props = { open: boolean; onClose: () => void; item?: RecurringExpense; onSaved: () => void }

/** Регулярный расход: аренда, абонплата, подписки — повторяется каждый месяц и попадает в план. */
export function RecurringModal({ open, onClose, item, onSaved }: Props) {
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [day, setDay] = useState('1')
  const [startMonth, setStartMonth] = useState(currentMonth())
  const [endMonth, setEndMonth] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(item?.amount ?? 0)
    setCategory(item?.category ?? '')
    setDescription(item?.description ?? '')
    setDay(String(item?.day ?? 1))
    setStartMonth(item?.startMonth ?? currentMonth())
    setEndMonth(item?.endMonth ?? '')
  }, [open, item])

  const months = useMemo(() => {
    const base = currentMonth()
    const set = new Set(Array.from({ length: 49 }, (_, i) => addMonths(base, i - 12)))
    for (const m of [item?.startMonth, item?.endMonth]) if (m) set.add(m)
    return [...set].sort().map((m) => ({ value: m, label: formatMonth(m) }))
  }, [item])

  const badRange = !!endMonth && endMonth < startMonth
  const valid = amount > 0 && !!category && description.trim().length >= 3 && !badRange && !saving

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      const body = { category, description: description.trim(), amount, day: Number(day), startMonth, endMonth: endMonth || null }
      if (item) await api.patch(`/finance/recurring/${item.id}`, body)
      else await api.post('/finance/recurring', { id: uid(), ...body })
      toast(item ? 'Расход сохранён' : 'Регулярный расход добавлен')
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Изменить регулярный расход' : 'Регулярный расход'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" form="recurring-form" disabled={!valid}>Сохранить</Button>
        </>
      }
    >
      <form id="recurring-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <MoneyInput label="Сумма в месяц" value={amount} onChange={setAmount} autoFocus />
        <Select label="День оплаты" value={day} onChange={setDay} options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-го числа` }))} />
        <Select className="sm:col-span-2" label="Категория" value={category} onChange={setCategory} placeholder="Выберите категорию" options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <Select label="Начиная с" value={startMonth} onChange={setStartMonth} options={months} />
        <Select label="По" value={endMonth} onChange={setEndMonth} placeholder="Бессрочно" options={months} error={badRange ? 'Раньше начала' : undefined} />
        <Textarea
          className="sm:col-span-2"
          label="За что"
          hint="Например: «Аренда помещения по договору №12» или «Абонплата за Zoom»"
          rows={2}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </form>
    </Modal>
  )
}
