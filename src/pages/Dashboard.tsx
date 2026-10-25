import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addMonths, currentMonth, formatDate, formatDays, formatMonth, isoWeekday, monthKey, today } from '@/lib/dates'
import { formatMoney, formatNumber, formatPhone, fullName } from '@/lib/format'
import { Balance } from '@/components/Money'
import { PaymentFormModal } from '@/components/PaymentFormModal'
import { StudentFormModal } from '@/components/StudentFormModal'
import { isActiveOn } from '@/store/billing'
import { ROLE_LABEL, useAccess } from '@/store/auth'
import { enrollmentsOf, useBalances, useCourseMap, useEnrollmentsByGroup, useGroupMap, useStudentMap, useTeacherMap } from '@/store/hooks'
import { LEAD_STATUS, PAYMENT_METHOD } from '@/store/labels'
import { useStore } from '@/store/store'
import type { LeadStatus } from '@/store/types'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Icon, StatCard } from '@/ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const { role, teacherId, can, ownsGroup } = useAccess()
  const money = can('payments')
  const students = useStore((s) => s.students)
  const groups = useStore((s) => s.groups)
  const payments = useStore((s) => s.payments)
  const attendance = useStore((s) => s.attendance)
  const leads = useStore((s) => s.leads)
  const centerName = useStore((s) => s.settings.centerName)
  const { byStudent } = useBalances()
  const byGroup = useEnrollmentsByGroup()
  const studentMap = useStudentMap()
  const groupMap = useGroupMap()
  const teacherMap = useTeacherMap()
  const courseMap = useCourseMap()
  const [payOpen, setPayOpen] = useState(false)
  const [studentOpen, setStudentOpen] = useState(false)

  const now = today()
  const cm = currentMonth()

  // Группы, которые видит эта роль: преподаватель — только свои
  const myGroups = useMemo(() => groups.filter((g) => !g.archived && ownsGroup(g)), [groups, ownsGroup])

  const stats = useMemo(() => {
    const ids = new Set(myGroups.map((g) => g.id))
    const enrolled = new Set<string>()
    for (const g of myGroups) for (const e of enrollmentsOf(byGroup, g.id)) if (!e.endDate) enrolled.add(e.studentId)
    const activeStudents = students.filter((s) => s.status === 'active' && (role !== 'teacher' || enrolled.has(s.id))).length

    let marked = 0
    let attended = 0
    for (const k in attendance) {
      const bar = k.indexOf('|')
      if (k.slice(bar + 1, bar + 8) !== cm || !ids.has(k.slice(0, bar))) continue
      marked++
      const v = attendance[k]
      if (v === 'present' || v === 'late') attended++
    }
    const rate = marked ? Math.round((attended / marked) * 100) : 0

    let income = 0
    let prevIncome = 0
    let debt = 0
    let debtors = 0
    if (money) {
      const prev = addMonths(cm, -1)
      for (const p of payments) {
        const m = monthKey(p.date)
        if (m === cm) income += p.amount
        else if (m === prev) prevIncome += p.amount
      }
      for (const s of students) {
        const b = byStudent.get(s.id)
        if (b && b.balance < 0) { debt -= b.balance; debtors++ }
      }
    }
    return { activeStudents, rate, income, prevIncome, debt, debtors }
  }, [myGroups, students, byGroup, attendance, cm, role, money, payments, byStudent])

  const todayLessons = useMemo(() => {
    const wd = isoWeekday(now)
    return myGroups.filter((g) => g.days.includes(wd) && g.startDate <= now).sort((a, b) => a.timeStart.localeCompare(b.timeStart))
  }, [myGroups, now])

  const topDebtors = useMemo(
    () =>
      !money
        ? []
        : students
            .map((s) => ({ s, b: byStudent.get(s.id)?.balance ?? 0 }))
            .filter((x) => x.b < 0)
            .sort((a, b) => a.b - b.b)
            .slice(0, 6),
    [students, byStudent, money],
  )

  const leadCounts = useMemo(() => {
    const c: Record<LeadStatus, number> = { new: 0, contacted: 0, trial: 0, won: 0, lost: 0 }
    for (const l of leads) c[l.status]++
    return c
  }, [leads])
  const openLeads = useMemo(() => leads.filter((l) => l.status !== 'won' && l.status !== 'lost').slice(0, 5), [leads])

  const incomeDiff = stats.prevIncome ? Math.round(((stats.income - stats.prevIncome) / stats.prevIncome) * 100) : 0
  const teacher = teacherMap.get(teacherId)
  const name = role === 'teacher' ? (teacher?.firstName ?? ROLE_LABEL.teacher) : role === 'manager' ? ROLE_LABEL.manager : centerName

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">{formatDate(now)}</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            Добрый день, <span className="text-primary">{name}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {can('students.manage') && <Button variant="secondary" icon="userPlus" onClick={() => setStudentOpen(true)}>Новый ученик</Button>}
          {money && <Button icon="wallet" onClick={() => setPayOpen(true)}>Принять оплату</Button>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {money ? (
          <>
            <StatCard accent icon="coins" label={`Доход · ${formatMonth(cm).toLowerCase()}`} value={formatMoney(stats.income)} hint={stats.prevIncome ? `${incomeDiff >= 0 ? '+' : ''}${incomeDiff}% к прошлому месяцу` : undefined} />
            <StatCard icon="users" label="Активные ученики" value={stats.activeStudents} hint={`в ${myGroups.length} группах`} />
            <StatCard icon="wallet" label="Общий долг" value={formatMoney(stats.debt)} hint={`${stats.debtors} должников`} />
          </>
        ) : (
          <>
            <StatCard accent icon="layers" label="Мои группы" value={myGroups.length} hint={`${todayLessons.length} занятий сегодня`} />
            <StatCard icon="users" label="Мои ученики" value={stats.activeStudents} hint="активные" />
            <StatCard icon="clock" label="Занятий сегодня" value={todayLessons.length} hint={todayLessons[0] ? `первое в ${todayLessons[0].timeStart}` : 'свободный день'} />
          </>
        )}
        <StatCard icon="calendarCheck" label="Посещаемость за месяц" value={`${stats.rate}%`} hint="был + опоздал" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Занятия сегодня" subtitle={`${todayLessons.length} по расписанию`} actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/attendance')}>Посещаемость</Button>} />
          {todayLessons.length === 0 ? (
            <EmptyState icon="calendar" title="Сегодня занятий нет" />
          ) : (
            <div className="flex flex-col gap-2">
              {todayLessons.map((g) => {
                const count = enrollmentsOf(byGroup, g.id).filter((e) => isActiveOn(e, now)).length
                const marked = enrollmentsOf(byGroup, g.id).filter((e) => isActiveOn(e, now) && attendance[`${g.id}|${now}|${e.studentId}`]).length
                const t = teacherMap.get(g.teacherId)
                return (
                  <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center gap-4 rounded-xl border border-line px-4 py-3 transition-colors hover:border-primary hover:bg-primary-soft/40">
                    <div className="w-14 shrink-0">
                      <div className="font-medium">{g.timeStart}</div>
                      <div className="text-xs text-subtle">{g.timeEnd}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{g.name}</div>
                      <div className="truncate text-[13px] text-muted">
                        {courseMap.get(g.courseId)?.name} · {t ? fullName(t) : '—'} · каб. {g.room}
                      </div>
                    </div>
                    {marked === count && count > 0 ? <Badge tone="dark">Отмечено</Badge> : <Badge tone="soft">{marked}/{count}</Badge>}
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        {money ? (
          <Card>
            <CardHeader title="Должники" subtitle={formatMoney(stats.debt)} actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/payments?tab=debtors')}>Все</Button>} />
            {topDebtors.length === 0 ? (
              <EmptyState icon="check" title="Долгов нет" />
            ) : (
              <div className="flex flex-col">
                {topDebtors.map(({ s, b }) => (
                  <Link key={s.id} to={`/students/${s.id}`} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0 hover:text-primary">
                    <Avatar seed={s.id} name={fullName(s)} size={32} />
                    <span className="min-w-0 flex-1 truncate">{fullName(s)}</span>
                    <Balance value={b} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader title="Мои группы" subtitle={`${myGroups.length} активных`} actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/groups')}>Все</Button>} />
            {myGroups.length === 0 ? (
              <EmptyState icon="layers" title="Групп пока нет" text="Менеджер назначит вам группы." />
            ) : (
              <div className="flex flex-col">
                {myGroups.map((g) => (
                  <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0 hover:text-primary">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="layers" size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{g.name}</span>
                      <span className="block text-xs text-subtle">{formatDays(g.days)} · {g.timeStart}</span>
                    </span>
                    <span className="text-[13px] text-muted">{enrollmentsOf(byGroup, g.id).filter((e) => !e.endDate).length} уч.</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {money && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader title="Последние оплаты" actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/payments')}>Все оплаты</Button>} />
            <div className="flex flex-col">
              {payments.slice(0, 6).map((p) => {
                const s = studentMap.get(p.studentId)
                return (
                  <div key={p.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="arrowUpRight" size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{s ? fullName(s) : '—'}</div>
                      <div className="truncate text-xs text-subtle">{groupMap.get(p.groupId)?.name} · {PAYMENT_METHOD[p.method]} · {formatDate(p.date)}</div>
                    </div>
                    <span className="font-medium whitespace-nowrap">+{formatNumber(p.amount)}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {can('funnel') ? (
            <Card>
              <CardHeader title="Воронка лидов" actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/leads')}>Лиды</Button>} />
              <div className="flex flex-col gap-3">
                {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((k) => {
                  const max = Math.max(1, ...Object.values(leadCounts))
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[13px] text-muted">{LEAD_STATUS[k]}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                        <div className={k === 'lost' ? 'h-full rounded-full bg-line-strong' : k === 'won' ? 'h-full rounded-full bg-ink' : 'h-full rounded-full bg-primary'} style={{ width: `${(leadCounts[k] / max) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right font-medium">{leadCounts[k]}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Лиды в работе" subtitle={`${openLeads.length} открытых`} actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/leads')}>Все</Button>} />
              {openLeads.length === 0 ? (
                <EmptyState icon="target" title="Открытых лидов нет" />
              ) : (
                <div className="flex flex-col">
                  {openLeads.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{l.name}</div>
                        <div className="text-xs text-subtle">{formatPhone(l.phone)}</div>
                      </div>
                      <Badge tone={l.status === 'new' ? 'orange' : 'soft'}>{LEAD_STATUS[l.status]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <PaymentFormModal open={payOpen} onClose={() => setPayOpen(false)} />
      <StudentFormModal open={studentOpen} onClose={() => setStudentOpen(false)} onCreated={(id) => navigate(`/students/${id}`)} />
    </>
  )
}
