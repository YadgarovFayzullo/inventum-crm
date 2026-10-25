import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { addDays, today } from '@/lib/dates'
import { uid } from '@/lib/id'
import { createSeed } from './seed'
import type { AttendanceMark, Course, Enrollment, Group, ID, Lead, Payment, Settings, Student, Teacher, Transfer } from './types'

export type Data = {
  students: Student[]
  courses: Course[]
  teachers: Teacher[]
  groups: Group[]
  enrollments: Enrollment[]
  transfers: Transfer[]
  /** ключ `${groupId}|${date}|${studentId}` — O(1) чтение/запись отметки */
  attendance: Record<string, AttendanceMark>
  payments: Payment[]
  leads: Lead[]
  settings: Settings
}

type Actions = {
  addStudent: (s: Omit<Student, 'id' | 'createdAt'>, groupId?: ID) => ID
  updateStudent: (id: ID, patch: Partial<Student>) => void

  enroll: (studentId: ID, groupId: ID, date?: string) => void
  unenroll: (enrollmentId: ID, date?: string) => void
  transfer: (studentId: ID, fromGroupId: ID, toGroupId: ID, date: string, reason?: string) => void

  addGroup: (g: Omit<Group, 'id' | 'archived'>) => ID
  updateGroup: (id: ID, patch: Partial<Group>) => void
  deleteGroup: (id: ID) => void

  addCourse: (c: Omit<Course, 'id'>) => void
  updateCourse: (id: ID, patch: Partial<Course>) => void
  deleteCourse: (id: ID) => void

  addTeacher: (t: Omit<Teacher, 'id' | 'createdAt'>) => void
  updateTeacher: (id: ID, patch: Partial<Teacher>) => void
  deleteTeacher: (id: ID) => void

  setMark: (groupId: ID, date: string, studentId: ID, mark: AttendanceMark | null) => void
  setMarks: (groupId: ID, date: string, studentIds: ID[], mark: AttendanceMark) => void

  addPayment: (p: Omit<Payment, 'id'>) => void
  deletePayment: (id: ID) => void

  addLead: (l: Omit<Lead, 'id' | 'createdAt'>) => void
  updateLead: (id: ID, patch: Partial<Lead>) => void
  deleteLead: (id: ID) => void
  convertLead: (id: ID, groupId?: ID) => ID

  updateSettings: (patch: Partial<Settings>) => void
  resetDemo: () => void
  clearAll: () => void
}

export const attKey = (groupId: ID, date: string, studentId: ID) => `${groupId}|${date}|${studentId}`

const patchById = <T extends { id: ID }>(list: T[], id: ID, patch: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x))

const empty = (): Data => ({
  students: [],
  courses: [],
  teachers: [],
  groups: [],
  enrollments: [],
  transfers: [],
  attendance: {},
  payments: [],
  leads: [],
  settings: { centerName: 'INVENTUM' },
})

/** Запись в localStorage откладывается и склеивается — UI никогда не ждёт сериализацию */
const debouncedStorage: StateStorage = (() => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  return {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => {
      clearTimeout(timers.get(k))
      timers.set(k, setTimeout(() => localStorage.setItem(k, v), 250))
    },
    removeItem: (k) => localStorage.removeItem(k),
  }
})()

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      addStudent: (s, groupId) => {
        const id = uid()
        set((st) => ({
          students: [{ ...s, id, createdAt: today() }, ...st.students],
          enrollments: groupId ? [...st.enrollments, { id: uid(), studentId: id, groupId, startDate: today() }] : st.enrollments,
        }))
        return id
      },
      updateStudent: (id, patch) =>
        set((st) => {
          const students = patchById(st.students, id, patch)
          // Ушедший ученик — закрываем все активные периоды, чтобы не начислялась оплата
          if (patch.status === 'left') {
            const end = today()
            return {
              students,
              enrollments: st.enrollments.map((e) => (e.studentId === id && !e.endDate ? { ...e, endDate: end } : e)),
            }
          }
          return { students }
        }),

      enroll: (studentId, groupId, date = today()) =>
        set((st) => {
          if (st.enrollments.some((e) => e.studentId === studentId && e.groupId === groupId && !e.endDate)) return st
          return { enrollments: [...st.enrollments, { id: uid(), studentId, groupId, startDate: date }] }
        }),
      unenroll: (enrollmentId, date = today()) =>
        set((st) => ({
          enrollments: st.enrollments
            .map((e) => (e.id === enrollmentId ? { ...e, endDate: date } : e))
            // Если дата ухода раньше даты прихода — период просто удаляется
            .filter((e) => !(e.id === enrollmentId && e.endDate! < e.startDate)),
        })),
      transfer: (studentId, fromGroupId, toGroupId, date, reason) =>
        set((st) => {
          const lastDay = addDays(date, -1)
          const enrollments = st.enrollments
            .map((e) =>
              e.studentId === studentId && e.groupId === fromGroupId && !e.endDate ? { ...e, endDate: lastDay } : e,
            )
            .filter((e) => !e.endDate || e.endDate >= e.startDate)
          enrollments.push({ id: uid(), studentId, groupId: toGroupId, startDate: date })
          return {
            enrollments,
            transfers: [{ id: uid(), studentId, fromGroupId, toGroupId, date, reason }, ...st.transfers],
          }
        }),

      addGroup: (g) => {
        const id = uid()
        set((st) => ({ groups: [...st.groups, { ...g, id, archived: false }] }))
        return id
      },
      updateGroup: (id, patch) => set((st) => ({ groups: patchById(st.groups, id, patch) })),
      deleteGroup: (id) =>
        set((st) => ({
          groups: st.groups.filter((g) => g.id !== id),
          enrollments: st.enrollments.filter((e) => e.groupId !== id),
          attendance: Object.fromEntries(Object.entries(st.attendance).filter(([k]) => !k.startsWith(`${id}|`))),
        })),

      addCourse: (c) => set((st) => ({ courses: [...st.courses, { ...c, id: uid() }] })),
      updateCourse: (id, patch) => set((st) => ({ courses: patchById(st.courses, id, patch) })),
      deleteCourse: (id) => set((st) => ({ courses: st.courses.filter((c) => c.id !== id) })),

      addTeacher: (t) => set((st) => ({ teachers: [...st.teachers, { ...t, id: uid(), createdAt: today() }] })),
      updateTeacher: (id, patch) => set((st) => ({ teachers: patchById(st.teachers, id, patch) })),
      deleteTeacher: (id) => set((st) => ({ teachers: st.teachers.filter((t) => t.id !== id) })),

      setMark: (groupId, date, studentId, mark) =>
        set((st) => {
          const attendance = { ...st.attendance }
          const k = attKey(groupId, date, studentId)
          if (mark) attendance[k] = mark
          else delete attendance[k]
          return { attendance }
        }),
      setMarks: (groupId, date, studentIds, mark) =>
        set((st) => {
          const attendance = { ...st.attendance }
          for (const sid of studentIds) attendance[attKey(groupId, date, sid)] = mark
          return { attendance }
        }),

      addPayment: (p) => set((st) => ({ payments: [{ ...p, id: uid() }, ...st.payments] })),
      deletePayment: (id) => set((st) => ({ payments: st.payments.filter((p) => p.id !== id) })),

      addLead: (l) => set((st) => ({ leads: [{ ...l, id: uid(), createdAt: today() }, ...st.leads] })),
      updateLead: (id, patch) => set((st) => ({ leads: patchById(st.leads, id, patch) })),
      deleteLead: (id) => set((st) => ({ leads: st.leads.filter((l) => l.id !== id) })),
      convertLead: (id, groupId) => {
        const lead = get().leads.find((l) => l.id === id)!
        const [firstName = '', ...rest] = lead.name.split(' ')
        const studentId = get().addStudent(
          { firstName, lastName: rest.join(' '), phone: lead.phone, parentName: '', parentPhone: '', status: 'active', discount: 0, source: lead.source, note: lead.note },
          groupId,
        )
        get().updateLead(id, { status: 'won' })
        return studentId
      },

      updateSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),
      resetDemo: () => set(createSeed()),
      clearAll: () => set(empty()),
    }),
    {
      name: 'inventum-crm',
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
      partialize: ({ students, courses, teachers, groups, enrollments, transfers, attendance, payments, leads, settings }) => ({
        students, courses, teachers, groups, enrollments, transfers, attendance, payments, leads, settings,
      }),
    },
  ),
)

// Сохранить несохранённое при закрытии вкладки
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const { students, courses, teachers, groups, enrollments, transfers, attendance, payments, leads, settings } = useStore.getState()
    localStorage.setItem(
      'inventum-crm',
      JSON.stringify({ state: { students, courses, teachers, groups, enrollments, transfers, attendance, payments, leads, settings }, version: 1 }),
    )
  })
}
