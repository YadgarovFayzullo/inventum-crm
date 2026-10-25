import { useEffect, useState } from 'react'
import { formatDays, today } from '@/lib/dates'
import { formatMoney, fullName } from '@/lib/format'
import { useStore } from '@/store/store'
import { useEnrollmentsByGroup } from '@/store/hooks'
import { Button, DatePicker, Input, Modal, Select, toast } from '@/ui'

type Props = { open: boolean; onClose: () => void; studentId: string; fromGroupId: string }

export function TransferModal({ open, onClose, studentId, fromGroupId }: Props) {
  const groups = useStore((s) => s.groups)
  const student = useStore((s) => s.students.find((x) => x.id === studentId))
  const transfer = useStore((s) => s.transfer)
  const byGroup = useEnrollmentsByGroup()
  const [to, setTo] = useState('')
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) { setTo(''); setDate(today()); setReason('') }
  }, [open])

  const from = groups.find((g) => g.id === fromGroupId)
  const targets = groups.filter((g) => !g.archived && g.id !== fromGroupId)
  const target = groups.find((g) => g.id === to)
  const count = (gid: string) => (byGroup.get(gid) ?? []).filter((e) => !e.endDate).length

  const submit = () => {
    if (!to) return
    transfer(studentId, fromGroupId, to, date, reason || undefined)
    toast(`Переведён в ${target?.name}`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Перевод в другую группу"
      description={student ? `${fullName(student)} · из «${from?.name}»` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button icon="transfer" disabled={!to} onClick={submit}>Перевести</Button>
        </>
      }
    >
      <Select
        label="Новая группа"
        value={to}
        onChange={setTo}
        placeholder="Выберите группу"
        options={targets.map((g) => ({ value: g.id, label: `${g.name} · ${count(g.id)}/${g.capacity}` }))}
      />
      {target && (
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-canvas p-3.5 text-[13px]">
          <div><div className="text-subtle">Дни</div>{formatDays(target.days)}</div>
          <div><div className="text-subtle">Время</div>{target.timeStart}–{target.timeEnd}</div>
          <div><div className="text-subtle">Цена</div>{formatMoney(target.price)}</div>
        </div>
      )}
      <DatePicker label="Дата перевода" value={date} onChange={setDate} hint="Оплата за месяц пересчитается пропорционально дням в каждой группе" />
      <Input label="Причина" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например: сменил уровень" />
    </Modal>
  )
}
