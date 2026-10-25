import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatDays, isoWeekday, today } from '@/lib/dates'
import { formatMoney, fullName } from '@/lib/format'
import { GroupFormModal } from '@/components/GroupFormModal'
import { useAccess } from '@/store/auth'
import { enrollmentsOf, useCourseMap, useEnrollmentsByGroup, useTeacherMap } from '@/store/hooks'
import { useStore } from '@/store/store'
import { Badge, Button, EmptyState, Icon, Input, PageHeader, Tabs } from '@/ui'

export default function Groups() {
  const navigate = useNavigate()
  const groups = useStore((s) => s.groups)
  const byGroup = useEnrollmentsByGroup()
  const courseMap = useCourseMap()
  const teacherMap = useTeacherMap()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const wd = isoWeekday(today())
  const { can, ownsGroup } = useAccess()
  const money = can('payments')
  const manage = can('groups.manage')

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return groups
      .filter(ownsGroup)
      .filter((g) => g.archived === (tab === 'archived'))
      .filter((g) => !t || g.name.toLowerCase().includes(t) || courseMap.get(g.courseId)?.name.toLowerCase().includes(t))
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
  }, [groups, tab, q, courseMap, ownsGroup])

  return (
    <>
      <PageHeader
        title="Группы"
        subtitle={`${groups.filter((g) => !g.archived && ownsGroup(g)).length} активных групп`}
        actions={manage ? <Button icon="plus" onClick={() => setOpen(true)}>Новая группа</Button> : undefined}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'active', label: 'Активные', count: groups.filter((g) => !g.archived && ownsGroup(g)).length },
            { value: 'archived', label: 'Архив', count: groups.filter((g) => g.archived && ownsGroup(g)).length },
          ]}
        />
        <Input className="max-w-80 flex-1" icon="search" placeholder="Название или курс" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon="layers" title="Групп нет" action={manage && tab === 'active' ? <Button icon="plus" onClick={() => setOpen(true)}>Создать группу</Button> : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => {
            const count = enrollmentsOf(byGroup, g.id).filter((e) => !e.endDate).length
            const fill = Math.min(1, count / g.capacity)
            const t = teacherMap.get(g.teacherId)
            const isToday = g.days.includes(wd)
            return (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="group flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[17px] font-medium group-hover:text-primary">{g.name}</div>
                    <div className="truncate text-[13px] text-muted">{courseMap.get(g.courseId)?.name}</div>
                  </div>
                  {isToday && !g.archived && <Badge tone="orange">Сегодня</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                  <span className="flex items-center gap-2 text-muted"><Icon name="calendar" size={16} />{formatDays(g.days)}</span>
                  <span className="flex items-center gap-2 text-muted"><Icon name="clock" size={16} />{g.timeStart}–{g.timeEnd}</span>
                  <span className="flex items-center gap-2 truncate text-muted"><Icon name="graduation" size={16} />{t ? fullName(t) : '—'}</span>
                  <span className="flex items-center gap-2 text-muted"><Icon name="door" size={16} />Каб. {g.room || '—'}</span>
                </div>
                <div className="mt-auto">
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span>{count} из {g.capacity} мест</span>
                    {money && <span className="text-muted">{formatMoney(g.price)}/мес</span>}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                    <div className={cn('h-full rounded-full', fill >= 1 ? 'bg-ink' : 'bg-primary')} style={{ width: `${fill * 100}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      <GroupFormModal open={open} onClose={() => setOpen(false)} onCreated={(id) => navigate(`/groups/${id}`)} />
    </>
  )
}
