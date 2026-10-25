import { Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { fullName } from '@/lib/format'
import { Icon, IconButton, type IconName } from '@/ui'
import { ROLE_LABEL, useAccess, useSession, type Perm } from '@/store/auth'
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

/** Текущий аккаунт и выход */
function AccountCard() {
  const user = useSession((s) => s.user)!
  const teachers = useStore((s) => s.teachers)
  const logout = useSession((s) => s.logout)
  const teacher = user.role === 'teacher' ? teachers.find((t) => t.id === user.teacherId) : undefined
  // у владельца и менеджера имени нет — показываем email, чтобы не дублировать роль
  const name = teacher ? fullName(teacher) : user.email
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/6 px-3 py-2.5">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon name={user.role === 'teacher' ? 'graduation' : 'user'} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-white">{name}</span>
        <span className="block text-[11px] text-white/50">{ROLE_LABEL[user.role]}</span>
      </span>
      <button
        type="button"
        aria-label="Выйти"
        title="Выйти"
        onClick={() => void logout()}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Icon name="logout" size={17} />
      </button>
    </div>
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
  const user = useSession((s) => s.user)
  const loaded = useStore((s) => s.loaded)
  const [loadError, setLoadError] = useState(false)
  // После входа тянем данные с сервера один раз; при выходе очищаем всё, чтобы следующий пользователь не увидел чужое
  useEffect(() => {
    if (!user) {
      useStore.getState().reset()
      return
    }
    setLoadError(false)
    useStore.getState().load().catch(() => setLoadError(true))
  }, [user])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const close = () => setOpen(false)
  if (!user) return <Navigate to="/login" replace />
  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-medium">Не удалось загрузить данные</p>
        <p className="text-muted">Проверьте соединение с сервером.</p>
        <button type="button" className="rounded-full bg-primary px-5 py-2.5 font-medium text-white" onClick={() => window.location.reload()}>Повторить</button>
      </div>
    )
  }
  if (!loaded) return <div className="flex min-h-screen items-center justify-center"><span className="size-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" /></div>

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
          <div className="mt-2"><AccountCard /></div>
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
