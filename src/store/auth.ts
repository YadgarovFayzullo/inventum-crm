import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

type Session = {
  role: Role
  /** Какой преподаватель вошёл (для роли teacher) */
  teacherId: string
  setSession: (role: Role, teacherId?: string) => void
}

export const useSession = create<Session>()(
  persist(
    (set) => ({
      role: 'owner',
      teacherId: 't-1',
      setSession: (role, teacherId) => set((s) => ({ role, teacherId: teacherId ?? s.teacherId })),
    }),
    { name: 'inventum-session', version: 1 },
  ),
)

export function useAccess() {
  const role = useSession((s) => s.role)
  const teacherId = useSession((s) => s.teacherId)
  return useMemo(
    () => ({
      role,
      teacherId,
      can: (p: Perm) => PERMS[role].includes(p),
      /** Группа доступна: менеджеру и владельцу — любая, преподавателю — только своя */
      ownsGroup: (g: Pick<Group, 'teacherId'>) => role !== 'teacher' || g.teacherId === teacherId,
    }),
    [role, teacherId],
  )
}
