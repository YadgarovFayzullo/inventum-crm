import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupOptions, seatsOf, useSeats } from '@/store/seats'
import { useStore } from '@/store/store'
import type { Lead } from '@/store/types'
import { Button, Modal, Select, toast } from '@/ui'

/** Превратить лида в ученика и сразу записать в группу (по умолчанию — в ту, что выбрана у лида) */
export function ConvertLeadModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const navigate = useNavigate()
  const groups = useStore((s) => s.groups)
  const convertLead = useStore((s) => s.convertLead)
  const seats = useSeats()
  const [gid, setGid] = useState('')

  useEffect(() => {
    // заполненную группу не подставляем — туда уже нельзя записать
    setGid(lead?.groupId && !seatsOf(seats, lead.groupId).full ? lead.groupId : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead])

  const options = useMemo(() => (lead ? groupOptions(groups, seats, lead) : []), [groups, seats, lead])
  const leadGroupFull = !!lead?.groupId && seatsOf(seats, lead.groupId).full

  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title="Записать в ученики"
      description={lead?.name}
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button
            onClick={() => {
              const id = convertLead(lead!.id, gid || undefined)
              toast(gid ? 'Лид стал учеником и записан в группу' : 'Лид стал учеником')
              onClose()
              navigate(`/students/${id}`)
            }}
          >
            Записать
          </Button>
        </>
      }
    >
      <Select label="Группа" value={gid} onChange={setGid} placeholder="Без группы" options={options} />
      {leadGroupFull && <p className="text-[13px] text-primary">Выбранная у лида группа уже заполнена — выберите другую.</p>}
    </Modal>
  )
}
