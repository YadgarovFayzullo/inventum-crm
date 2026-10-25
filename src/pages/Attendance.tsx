import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentMonth, isoWeekday, today } from '@/lib/dates'
import { AttendanceGrid, MarkLegend } from '@/components/AttendanceGrid'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { useAccess } from '@/store/auth'
import { useStore } from '@/store/store'
import { Button, Card, EmptyState, PageHeader, Select } from '@/ui'

export default function Attendance() {
  const navigate = useNavigate()
  const groups = useStore((s) => s.groups)
  const { ownsGroup } = useAccess()
  const wd = isoWeekday(today())
  // Сначала группы, у которых занятие сегодня; преподаватель видит только свои
  const sorted = useMemo(
    () =>
      groups
        .filter((g) => !g.archived && ownsGroup(g))
        .sort((a, b) => Number(b.days.includes(wd)) - Number(a.days.includes(wd)) || a.timeStart.localeCompare(b.timeStart)),
    [groups, wd, ownsGroup],
  )
  const [gid, setGid] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const group = sorted.find((g) => g.id === gid) ?? sorted[0]

  return (
    <>
      <PageHeader title="Посещаемость" subtitle="Сначала показаны группы, у которых занятие сегодня" actions={<MonthSwitcher value={month} onChange={setMonth} />} />
      {!group ? (
        <EmptyState icon="layers" title="Нет активных групп" />
      ) : (
        <>
          <Select
            className="mb-4 max-w-sm"
            label="Группа"
            value={group.id}
            onChange={setGid}
            options={sorted.map((g) => ({ value: g.id, label: g.name, hint: `${g.days.includes(wd) ? 'сегодня · ' : ''}${g.timeStart}` }))}
          />
          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
              <MarkLegend />
              <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate(`/groups/${group.id}`)}>Открыть группу</Button>
            </div>
            <div className="pb-3"><AttendanceGrid group={group} month={month} /></div>
          </Card>
        </>
      )}
    </>
  )
}
