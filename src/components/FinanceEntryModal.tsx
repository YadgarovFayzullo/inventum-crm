import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { today } from '@/lib/dates'
import { uid } from '@/lib/id'
import { PAYMENT_METHOD } from '@/store/labels'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type FinanceEntry, type FinanceKind, type PaymentMethod } from '@/store/types'
import { Button, DatePicker, Modal, MoneyInput, Select, Tabs, Textarea, toast } from '@/ui'

type Props = { open: boolean; onClose: () => void; entry?: FinanceEntry; onSaved: () => void }

const categoriesOf = (kind: FinanceKind): readonly string[] => (kind === 'income' ? INCOME_CATEGORIES.filter((c) => c !== 'Оплата обучения') : EXPENSE_CATEGORIES)

/** Ручная запись дохода или расхода. Описание «почему» обязательно — по нему бухгалтер потом объясняет движение денег. */
export function FinanceEntryModal({ open, onClose, entry, onSaved }: Props) {
  const [kind, setKind] = useState<FinanceKind>('expense')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(today())
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind(entry?.kind ?? 'expense')
    setAmount(entry?.amount ?? 0)
    setDate(entry?.date ?? today())
    setCategory(entry?.category ?? '')
    setDescription(entry?.description ?? '')
    setMethod(entry?.method ?? 'cash')
  }, [open, entry])

  const valid = amount > 0 && !!category && description.trim().length >= 3 && !saving

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      const body = { kind, amount, date, category, description: description.trim(), method }
      if (entry) await api.patch(`/finance/entries/${entry.id}`, body)
      else await api.post('/finance/entries', { id: uid(), ...body })
      toast(entry ? 'Запись сохранена' : kind === 'income' ? 'Доход добавлен' : 'Расход добавлен')
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
      title={entry ? 'Изменить запись' : 'Новая запись'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" form="finance-form" disabled={!valid}>Сохранить</Button>
        </>
      }
    >
      <form id="finance-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Tabs
            value={kind}
            onChange={(k) => { setKind(k); setCategory('') }}
            tabs={[{ value: 'expense', label: 'Расход' }, { value: 'income', label: 'Доход' }]}
          />
        </div>
        <MoneyInput label="Сумма" value={amount} onChange={setAmount} autoFocus />
        <DatePicker label="Дата" value={date} onChange={setDate} />
        <Select label="Категория" value={category} onChange={setCategory} placeholder="Выберите категорию" options={categoriesOf(kind).map((c) => ({ value: c, label: c }))} />
        <Select label="Способ" value={method} onChange={(v) => setMethod(v as PaymentMethod)} options={Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label }))} />
        <Textarea
          className="sm:col-span-2"
          label={kind === 'income' ? 'Почему доход' : 'Почему расход'}
          hint="Например: «Аренда кабинета за ноябрь по договору №12» — минимум 3 символа"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </form>
    </Modal>
  )
}
