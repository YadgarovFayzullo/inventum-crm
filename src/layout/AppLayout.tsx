import { Suspense, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { fullName } from '@/lib/format'
import { Icon, IconButton, Menu, type IconName, type MenuItem } from '@/ui'
import { ROLE_LABEL, useAccess, useSession, type Perm, type Role } from '@/store/auth'
import { useStore } from '@/store/store'

type NavDef = { to: string; label: string; icon: IconName; perm?: Perm }

const NAV: NavDef[] = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/students', label: 'Ученики', icon: 'users' },
  { to: '/groups', label: 'Группы', icon: 'layers' },
  { to: '/attendance', label: 'Посещаемость', icon: 'calendarCheck' },
  { to: '/payments', label: 'Оплаты', icon: 'wallet', perm: 'payments' },
  { to: '/leads', label: 'Лиды', icon: 'target', perm: 'leads' },
  { to: '/teachers', label: 'Преподаватели', icon: 'graduation', perm: 'teachers.view' },
  { to: '/courses', label: 'Курсы', icon: 'book', perm: 'courses' },
]

const NAV_BOTTOM: NavDef[] = [
  { to: '/ui-kit', label: 'UI Kit', icon: 'grid', perm: 'uikit' },
  { to: '/settings', label: 'Настройки', icon: 'gear', perm: 'settings' },
]

/** Переключатель роли. Это демо без входа по паролю — настоящую защиту даст бэкенд с авторизацией. */
function RoleSwitcher() {
  const { role, teacherId } = useAccess()
  const teachers = useStore((s) => s.teachers)
  const setSession = useSession((s) => s.setSession)
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  const teacher = teachers.find((t) => t.id === teacherId)
  const who = role === 'teacher' && teacher ? fullName(teacher) : ROLE_LABEL[role]

  const items = useMemo<MenuItem[]>(() => {
    const go = (r: Role, tid?: string) => () => {
      setSession(r, tid)
      navigate('/')
    }
    return [
      { key: 'owner', label: ROLE_LABEL.owner, active: role === 'owner', onSelect: go('owner') },
      { key: 'manager', label: ROLE_LABEL.manager, active: role === 'manager', onSelect: go('manager') },
      ...teachers.map((t, i) => ({
        key: t.id,
        label: `Преподаватель · ${t.firstName}`,
        divider: i === 0,
        active: role === 'teacher' && teacherId === t.id,
        onSelect: go('teacher', t.id),
      })),
    ]
  }, [role, teacherId, teachers, setSession, navigate])

  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
        className="flex w-full items-center gap-3 rounded-xl bg-white/6 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Icon name={role === 'teacher' ? 'graduation' : 'user'} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-white">{who}</span>
          <span className="block text-[11px] text-white/50">{role === 'teacher' ? ROLE_LABEL.teacher : 'Сменить роль'}</span>
        </span>
        <Icon name="chevronDown" size={14} className="text-white/50" />
      </button>
      <Menu anchor={anchor} items={items} onClose={() => setAnchor(null)} title="Войти как (демо)" width={250} />
    </>
  )
}

function Logo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-primary">
        <span className="h-4.5 w-1.5 rounded-[2px] bg-white" />
      </span>
      <div className="leading-none">
        <div className="text-[15px] font-medium tracking-[0.08em] text-white">{name}</div>
        <div className="mt-1 text-[11px] text-white/50">учебный центр</div>
      </div>
    </div>
  )
}

function NavItem({ to, label, icon, onClick }: { to: string; label: string; icon: IconName; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex h-10.5 items-center gap-3 rounded-full px-3.5 font-medium transition-colors',
          isActive ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/8 hover:text-white',
        )
      }
    >
      <Icon name={icon} size={19} />
      {label}
    </NavLink>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const centerName = useStore((s) => s.settings.centerName)
  const { can } = useAccess()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const close = () => setOpen(false)

  return (
    <div className="min-h-full lg:pl-62">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-62 flex-col bg-ink px-3 py-5 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Logo name={centerName} />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.filter((n) => !n.perm || can(n.perm)).map(({ perm: _p, ...n }) => <NavItem key={n.to} {...n} onClick={close} />)}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          {NAV_BOTTOM.filter((n) => !n.perm || can(n.perm)).map(({ perm: _p, ...n }) => <NavItem key={n.to} {...n} onClick={close} />)}
          <div className="mt-2"><RoleSwitcher /></div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-overlay lg:hidden" onClick={close} />}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
        <IconButton icon="menu" label="Меню" onClick={() => setOpen(true)} />
        <span className="font-medium tracking-[0.08em]">{centerName}</span>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <Suspense fallback={<div className="h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
