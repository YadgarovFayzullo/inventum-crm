import { useMemo } from 'react'
import { create } from 'zustand'
import { api, setUnauthorizedHandler } from '@/lib/api'
import type { Group } from './types'

export type Role = 'owner' | 'manager' | 'teacher'

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  teacher: 'Преподаватель',
}

export type Perm =
  | 'students.manage' // добавлять/редактировать учеников, записывать и переводить по группам
  | 'groups.manage' // создавать, менять, архивировать группы
  | 'payments' // оплаты, балансы, должники, цены
  | 'leads' // страница лидов
  | 'teachers.view' // список преподавателей
  | 'teachers.manage' // зарплаты и редактирование преподавателей
  | 'courses'
  | 'settings'
  | 'uikit'
  | 'funnel' // воронка лидов на главной

/*
  Преподаватель — только свои группы: посещаемость и список своих учеников.
  Менеджер — всё то же самое по всем группам + управление учениками, группами, оплатами, лидами.
  Владелец — всё, включая зарплаты, курсы и настройки.
*/
const MANAGER: Perm[] = ['students.manage', 'groups.manage', 'payments', 'leads', 'teachers.view']
const PERMS: Record<Role, Perm[]> = {
  teacher: [],
  manager: MANAGER,
  owner: [...MANAGER, 'teachers.manage', 'courses', 'settings', 'uikit', 'funnel'],
}

export type User = { id: string; email: string; role: Role; name: string; teacherId: string }

type Session = {
  user: User | null
  /** true, когда проверка текущей сессии на сервере завершена */
  ready: boolean
  init: () => Promise<void>
  /** Бросает ApiError при неверном пароле */
  login: (email: string, password: string, remember: boolean) => Promise<void>
  logout: () => Promise<void>
}

export const useSession = create<Session>()((set) => ({
  user: null,
  ready: false,
  init: async () => {
    try {
      const { user } = await api.get<{ user: User | null }>('/auth/me')
      set({ user, ready: true })
    } catch {
      set({ user: null, ready: true })
    }
  },
  login: async (email, password, remember) => {
    const user = await api.post<User>('/auth/login', { email, password, remember })
    set({ user })
  },
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* всё равно выходим локально */
    }
    set({ user: null })
  },
}))

// Сессия истекла на сервере — возвращаем на страницу входа
setUnauthorizedHandler(() => useSession.setState({ user: null }))

export function useAccess() {
  const user = useSession((s) => s.user)
  const role: Role = user?.role ?? 'teacher'
  const teacherId = user?.teacherId ?? ''
  return useMemo(
    () => ({
      role,
      teacherId,
      can: (p: Perm) => !!user && PERMS[role].includes(p),
      /** Группа доступна: менеджеру и владельцу — любая, преподавателю — только своя */
      ownsGroup: (g: Pick<Group, 'teacherId'>) => role !== 'teacher' || g.teacherId === teacherId,
    }),
    [user, role, teacherId],
  )
}
