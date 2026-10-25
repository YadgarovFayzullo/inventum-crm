import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatDate, today } from '@/lib/dates'
import { formatPhone, phoneHref } from '@/lib/format'
import { useCourseMap } from '@/store/hooks'
import { LEAD_SOURCES, LEAD_STATUS } from '@/store/labels'
import { useStore } from '@/store/store'
import type { Lead, LeadStatus } from '@/store/types'
import { Badge, Button, IconButton, Input, Modal, PageHeader, PhoneInput, Select, Textarea, toast } from '@/ui'

const ORDER: LeadStatus[] = ['new', 'contacted', 'trial', 'won', 'lost']

function LeadModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead?: Lead }) {
  const courses = useStore((s) => s.courses)
  const { addLead, updateLead } = useStore.getState()
  const [f, setF] = useState({ name: '', phone: '', courseId: '', source: 'Instagram', note: '' })
  useEffect(() => {
    if (open) setF(lead ? { name: lead.name, phone: lead.phone, courseId: lead.courseId ?? '', source: lead.source, note: lead.note ?? '' } : { name: '', phone: '', courseId: '', source: 'Instagram', note: '' })
  }, [open, lead])
  const valid = f.name.trim() && f.phone.length === 9
  const submit = () => {
    const data = { ...f, name: f.name.trim(), courseId: f.courseId || undefined, note: f.note || undefined }
    if (lead) updateLead(lead.id, data)
    else addLead({ ...data, status: 'new' })
    toast(lead ? 'Лид сохранён' : 'Лид добавлен')
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? 'Редактировать лид' : 'Новый лид'}
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button disabled={!valid} onClick={submit}>Сохранить</Button></>}
    >
      <Input label="Имя и фамилия" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
      <PhoneInput label="Телефон" value={f.phone} onChange={(phone) => setF({ ...f, phone })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Курс" value={f.courseId} onChange={(courseId) => setF({ ...f, courseId })} placeholder="Не выбран" options={courses.map((c) => ({ value: c.id, label: c.name }))} />
        <Select label="Источник" value={f.source} onChange={(source) => setF({ ...f, source })} options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />
      </div>
      <Textarea label="Заметка" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
    </Modal>
  )
}

function ConvertModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const navigate = useNavigate()
  const groups = useStore((s) => s.groups)
  const convertLead = useStore((s) => s.convertLead)
  const [gid, setGid] = useState('')
  useEffect(() => {
    setGid('')
  }, [lead])
  const options = groups.filter((g) => !g.archived && (!lead?.courseId || g.courseId === lead.courseId))
  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title="Записать в ученики"
      description={lead?.name}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={() => { const id = convertLead(lead!.id, gid || undefined); toast('Лид стал учеником'); onClose(); navigate(`/students/${id}`) }}>Записать</Button>
        </>
      }
    >
      <Select label="Группа" value={gid} onChange={setGid} placeholder="Без группы" options={options.map((g) => ({ value: g.id, label: `${g.name} · ${g.timeStart}` }))} />
    </Modal>
  )
}

export default function Leads() {
  const leads = useStore((s) => s.leads)
  const { updateLead, deleteLead } = useStore.getState()
  const courseMap = useCourseMap()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | undefined>()
  const [converting, setConverting] = useState<Lead | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<LeadStatus | null>(null)

  const columns = useMemo(() => {
    const m = Object.fromEntries(ORDER.map((s) => [s, [] as Lead[]])) as Record<LeadStatus, Lead[]>
    for (const l of leads) m[l.status].push(l)
    return m
  }, [leads])

  const newToday = leads.filter((l) => l.createdAt === today()).length
  const conversion = leads.length ? Math.round((columns.won.length / leads.length) * 100) : 0

  return (
    <>
      <PageHeader
        title="Лиды"
        subtitle={`${newToday} новых сегодня · конверсия ${conversion}%`}
        actions={<Button icon="plus" onClick={() => { setEditing(undefined); setOpen(true) }}>Новый лид</Button>}
      />
      <p className="-mt-3 mb-4 text-[13px] text-subtle">Перетаскивайте карточки между колонками, чтобы менять этап</p>
      <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {ORDER.map((status) => (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setOver(status) }}
            onDragLeave={() => setOver(null)}
            onDrop={() => { if (dragId) updateLead(dragId, { status }); setDragId(null); setOver(null) }}
            className={cn('flex min-h-96 flex-col gap-2 rounded-2xl p-2 transition-colors', over === status ? 'bg-primary-soft' : 'bg-surface-2')}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="font-medium">{LEAD_STATUS[status]}</span>
              <Badge tone={status === 'new' ? 'orange' : status === 'won' ? 'dark' : 'gray'}>{columns[status].length}</Badge>
            </div>
            {columns[status].map((l) => (
              <div
                key={l.id}
                draggable
                onDragStart={() => setDragId(l.id)}
                className={cn('cursor-grab rounded-xl border border-line bg-surface p-3.5 active:cursor-grabbing', dragId === l.id && 'opacity-50')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{l.name}</div>
                    <a href={phoneHref(l.phone)} className="text-[13px] text-muted hover:text-primary">{formatPhone(l.phone)}</a>
                  </div>
                  <IconButton icon="edit" size="sm" label="Изменить" onClick={() => { setEditing(l); setOpen(true) }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {l.courseId && <Badge tone="soft">{courseMap.get(l.courseId)?.name}</Badge>}
                  <Badge tone="outline">{l.source}</Badge>
                </div>
                {l.note && <p className="mt-2 text-[13px] text-muted">{l.note}</p>}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-subtle">{formatDate(l.createdAt)}</span>
                  <div className="flex gap-1">
                    {status !== 'won' && <Button size="sm" variant="soft" onClick={() => setConverting(l)}>В ученики</Button>}
                    <IconButton icon="trash" size="sm" label="Удалить" onClick={() => { deleteLead(l.id); toast('Лид удалён') }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <LeadModal open={open} onClose={() => setOpen(false)} lead={editing} />
      <ConvertModal lead={converting} onClose={() => setConverting(null)} />
    </>
  )
}
