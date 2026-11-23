import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatDate, formatDays, today, WEEKDAYS_SHORT } from '@/lib/dates'
import { formatPhone, phoneHref } from '@/lib/format'
import { ConvertLeadModal } from '@/components/ConvertLeadModal'
import { useCourseMap, useGroupMap } from '@/store/hooks'
import { LEAD_SOURCES, LEAD_STATUS, TIME_SLOT, TIME_SLOT_SHORT } from '@/store/labels'
import { groupLabel, groupOptions, isOpenLead, seatsHint, seatsOf, useSeats } from '@/store/seats'
import { useStore } from '@/store/store'
import type { Lead, LeadStatus, TimeSlot } from '@/store/types'
import { Badge, Button, Chips, Field, IconButton, Input, Modal, PageHeader, PhoneInput, Select, Textarea, toast } from '@/ui'

const ORDER: LeadStatus[] = ['new', 'contacted', 'trial', 'won', 'lost']
const DAY_OPTIONS = WEEKDAYS_SHORT.map((label, i) => ({ value: i + 1, label }))
const SLOT_OPTIONS = (Object.keys(TIME_SLOT) as TimeSlot[]).map((v) => ({ value: v, label: TIME_SLOT[v] }))
/** Фильтр «Без группы»: открытые лиды, которым ещё не подобрали группу */
const NO_GROUP = '__none'

type Form = { name: string; phone: string; courseId: string; source: string; note: string; groupId: string; preferredDays: number[]; preferredSlot: string }
const blank = (): Form => ({ name: '', phone: '', courseId: '', source: 'Instagram', note: '', groupId: '', preferredDays: [], preferredSlot: '' })

/** «Пн, Ср · вечер» */
const wishText = (l: Pick<Lead, 'preferredDays' | 'preferredSlot'>) =>
  [l.preferredDays?.length ? formatDays(l.preferredDays) : '', l.preferredSlot ? TIME_SLOT_SHORT[l.preferredSlot] : ''].filter(Boolean).join(' · ')

function LeadModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead?: Lead }) {
  const courses = useStore((s) => s.courses)
  const groups = useStore((s) => s.groups)
  const seats = useSeats()
  const groupMap = useGroupMap()
  const { addLead, updateLead } = useStore.getState()
  const [f, setF] = useState<Form>(blank)
  useEffect(() => {
    if (!open) return
    setF(lead
      ? { name: lead.name, phone: lead.phone, courseId: lead.courseId ?? '', source: lead.source, note: lead.note ?? '', groupId: lead.groupId ?? '', preferredDays: lead.preferredDays ?? [], preferredSlot: lead.preferredSlot ?? '' }
      : blank())
  }, [open, lead])

  const wish = { courseId: f.courseId || undefined, preferredDays: f.preferredDays, preferredSlot: (f.preferredSlot || undefined) as TimeSlot | undefined }
  const options = groupOptions(groups, seats, wish, lead?.groupId)
  const picked = f.groupId ? groupMap.get(f.groupId) : undefined
  const pickedSeats = picked && seatsOf(seats, picked.id)
  const valid = f.name.trim() && f.phone.length === 9

  const submit = () => {
    const data = {
      name: f.name.trim(),
      phone: f.phone,
      source: f.source,
      // группа задаёт курс, если курс не выбран вручную
      courseId: f.courseId || picked?.courseId || undefined,
      note: f.note || undefined,
      groupId: f.groupId || undefined,
      preferredDays: f.preferredDays.length ? [...f.preferredDays].sort((a, b) => a - b) : undefined,
      preferredSlot: (f.preferredSlot || undefined) as TimeSlot | undefined,
    }
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
        <Select
          label="Курс"
          value={f.courseId}
          // группа другого курса больше не подходит
          onChange={(courseId) => setF({ ...f, courseId, groupId: courseId && picked && picked.courseId !== courseId ? '' : f.groupId })}
          placeholder="Не выбран"
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select label="Источник" value={f.source} onChange={(source) => setF({ ...f, source })} options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />
      </div>
      <Field label="Удобные дни">
        <Chips options={DAY_OPTIONS} value={f.preferredDays} onChange={(preferredDays) => setF({ ...f, preferredDays })} />
      </Field>
      <Select label="Удобное время" value={f.preferredSlot} onChange={(preferredSlot) => setF({ ...f, preferredSlot })} placeholder="Любое" options={SLOT_OPTIONS} />
      <Select
        label="Группа"
        hint={options.length ? 'Галочкой отмечены группы под удобные дни и время. Заполненные группы скрыты.' : 'Нет групп с местами под этот курс'}
        value={f.groupId}
        onChange={(groupId) => setF({ ...f, groupId })}
        placeholder="Пока не выбрана"
        options={options}
      />
      {pickedSeats && pickedSeats.free === 0 && !pickedSeats.full && (
        <p className="-mt-2 text-[13px] text-primary">С учётом других заявок мест не остаётся: {seatsHint(pickedSeats)}.</p>
      )}
      <Textarea label="Заметка" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
    </Modal>
  )
}

export default function Leads() {
  const leads = useStore((s) => s.leads)
  const groups = useStore((s) => s.groups)
  const { updateLead, deleteLead } = useStore.getState()
  const courseMap = useCourseMap()
  const groupMap = useGroupMap()
  const seats = useSeats()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | undefined>()
  const [converting, setConverting] = useState<Lead | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<LeadStatus | null>(null)
  const [q, setQ] = useState('')
  const [groupFilter, setGroupFilter] = useState('')

  const noGroup = useMemo(() => leads.filter((l) => isOpenLead(l) && !l.groupId).length, [leads])

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase()
    const digits = t.replace(/\D/g, '')
    return leads.filter((l) => {
      if (groupFilter === NO_GROUP ? !isOpenLead(l) || !!l.groupId : groupFilter && l.groupId !== groupFilter) return false
      return !t || l.name.toLowerCase().includes(t) || (digits !== '' && l.phone.includes(digits))
    })
  }, [leads, q, groupFilter])

  const columns = useMemo(() => {
    const m = Object.fromEntries(ORDER.map((s) => [s, [] as Lead[]])) as Record<LeadStatus, Lead[]>
    for (const l of visible) m[l.status].push(l)
    return m
  }, [visible])

  const filterOptions = useMemo(
    () => [
      { value: NO_GROUP, label: 'Без группы', hint: String(noGroup) },
      ...groups.filter((g) => !g.archived).sort((a, b) => a.timeStart.localeCompare(b.timeStart)).map((g) => ({ value: g.id, label: groupLabel(g), hint: seatsHint(seatsOf(seats, g.id)) })),
    ],
    [groups, seats, noGroup],
  )

  const newToday = leads.filter((l) => l.createdAt === today()).length
  const won = leads.filter((l) => l.status === 'won').length
  const conversion = leads.length ? Math.round((won / leads.length) * 100) : 0

  return (
    <>
      <PageHeader
        title="Лиды"
        subtitle={`${newToday} новых сегодня · конверсия ${conversion}%${noGroup ? ` · ${noGroup} без группы` : ''}`}
        actions={<Button icon="plus" onClick={() => { setEditing(undefined); setOpen(true) }}>Новый лид</Button>}
      />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input className="max-w-72 flex-1" icon="search" placeholder="Имя или телефон" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="w-full max-w-80" value={groupFilter} onChange={setGroupFilter} placeholder="Все группы" options={filterOptions} />
      </div>
      <p className="mb-4 text-[13px] text-subtle">Перетаскивайте карточки между колонками, чтобы менять этап</p>
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
            {columns[status].map((l) => {
              const g = l.groupId ? groupMap.get(l.groupId) : undefined
              const wish = wishText(l)
              return (
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
                  {g ? (
                    <div className="mt-2 text-[13px]">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted"> · {formatDays(g.days)} {g.timeStart}</span>
                    </div>
                  ) : isOpenLead(l) ? (
                    <button type="button" onClick={() => { setEditing(l); setOpen(true) }} className="mt-2 text-[13px] font-medium text-primary hover:underline">
                      Без группы — подобрать
                    </button>
                  ) : null}
                  {wish && <div className="mt-1 text-xs text-subtle">Удобно: {wish}</div>}
                  {l.note && <p className="mt-2 text-[13px] text-muted">{l.note}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-subtle">{formatDate(l.createdAt)}</span>
                    <div className="flex gap-1">
                      {status !== 'won' && <Button size="sm" variant="soft" onClick={() => setConverting(l)}>В ученики</Button>}
                      <IconButton icon="trash" size="sm" label="Удалить" onClick={() => { deleteLead(l.id); toast('Лид удалён') }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <LeadModal open={open} onClose={() => setOpen(false)} lead={editing} />
      <ConvertLeadModal lead={converting} onClose={() => setConverting(null)} />
    </>
  )
}
