import { create } from 'zustand'
import { api, ApiError } from '@/lib/api'
import { addDays, today } from '@/lib/dates'
import { uid } from '@/lib/id'
import { toast } from '@/ui/Toast'
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
  /** Загрузить данные с сервера (по правам текущей роли) */
  load: () => Promise<void>
  reset: () => void

  addStudent: (s: Omit<Student, 'id' | 'createdAt'>, groupId?: ID) => ID
  updateStudent: (id: ID, patch: Partial<Student>) => void
  setStudentPhoto: (id: ID, photo: Blob | null) => Promise<void>

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
  /** Заменить все данные на сервере (демо, восстановление из файла) */
  importData: (data: Data) => Promise<void>
  resetDemo: () => Promise<void>
  clearAll: () => Promise<void>
}

export const attKey = (groupId: ID, date: string, studentId: ID) => `${groupId}|${date}|${studentId}`

const patchById = <T extends { id: ID }>(list: T[], id: ID, patch: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x))

const emptyData = (): Data => ({
  students: [], courses: [], teachers: [], groups: [], enrollments: [], transfers: [],
  attendance: {}, payments: [], leads: [], settings: { centerName: 'INVENTUM' },
})

/** undefined → null, чтобы сервер понял «очистить поле» (в JSON undefined просто пропадает) */
const clearable = <T extends object>(patch: T, keys: (keyof T)[]) => {
  const out = { ...patch } as Record<string, unknown>
  for (const k of keys) if (k in patch && (patch[k] === undefined || patch[k] === '')) out[k as string] = null
  return out
}

/*
  Все запросы идут в один ряд: «создать ученика» гарантированно дойдёт раньше, чем «записать его в группу».
  Интерфейс обновляется сразу (оптимистично); если сервер отказал — показываем ошибку и перезагружаем данные.
*/
let queue: Promise<unknown> = Promise.resolve()
function push(task: () => Promise<unknown>) {
  queue = queue.then(task).catch(async (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) return // выход обработает слой авторизации
    toast(e instanceof ApiError ? e.message : 'Нет связи с сервером', 'error')
    await useStore.getState().load().catch(() => undefined)
  })
}

export const useStore = create<Data & Actions & { loaded: boolean }>()((set, get) => ({
  ...emptyData(),
  loaded: false,

  load: async () => {
    const data = await api.get<Data>('/bootstrap')
    set({ ...data, loaded: true })
  },
  reset: () => {
    queue = Promise.resolve()
    set({ ...emptyData(), loaded: false })
  },

  addStudent: (s, groupId) => {
    const id = uid()
    const enrollment = groupId ? { id: uid(), studentId: id, groupId, startDate: today() } : undefined
    const student: Student = { ...s, id, createdAt: today() }
    set((st) => ({
      students: [student, ...st.students],
      enrollments: enrollment ? [...st.enrollments, enrollment] : st.enrollments,
    }))
    push(() => api.post('/students', { ...student, enrollment: enrollment && { id: enrollment.id, groupId, startDate: enrollment.startDate } }))
    return id
  },
  updateStudent: (id, patch) => {
    const closeOn = today()
    set((st) => ({
      students: patchById(st.students, id, patch),
      // Ушедший ученик — закрываем все активные периоды, чтобы не начислялась оплата
      enrollments: patch.status === 'left' ? st.enrollments.map((e) => (e.studentId === id && !e.endDate ? { ...e, endDate: closeOn } : e)) : st.enrollments,
    }))
    const { photoVersion: _p, ...rest } = patch
    push(() => api.patch(`/students/${id}`, { ...clearable(rest, ['birthDate', 'source', 'note']), closeOn: patch.status === 'left' ? closeOn : undefined }))
  },
  setStudentPhoto: async (id, photo) => {
    try {
      if (photo) {
        const { photoVersion } = await api.upload<{ photoVersion: number }>(`/students/${id}/photo`, photo)
        set((st) => ({ students: patchById(st.students, id, { photoVersion }) }))
      } else {
        await api.del(`/students/${id}/photo`)
        set((st) => ({ students: patchById(st.students, id, { photoVersion: 0 }) }))
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Не удалось сохранить фото', 'error')
      throw e
    }
  },

  enroll: (studentId, groupId, date = today()) => {
    if (get().enrollments.some((e) => e.studentId === studentId && e.groupId === groupId && !e.endDate)) return
    const e: Enrollment = { id: uid(), studentId, groupId, startDate: date }
    set((st) => ({ enrollments: [...st.enrollments, e] }))
    push(() => api.post('/enrollments', e))
  },
  unenroll: (enrollmentId, date = today()) => {
    set((st) => ({
      enrollments: st.enrollments
        .map((e) => (e.id === enrollmentId ? { ...e, endDate: date } : e))
        // Если дата ухода раньше даты прихода — период просто удаляется
        .filter((e) => !(e.id === enrollmentId && e.endDate! < e.startDate)),
    }))
    push(() => api.post(`/enrollments/${enrollmentId}/end`, { date }))
  },
  transfer: (studentId, fromGroupId, toGroupId, date, reason) => {
    const lastDay = addDays(date, -1)
    const enrollmentId = uid()
    const transferId = uid()
    set((st) => {
      const enrollments = st.enrollments
        .map((e) => (e.studentId === studentId && e.groupId === fromGroupId && !e.endDate ? { ...e, endDate: lastDay } : e))
        .filter((e) => !e.endDate || e.endDate >= e.startDate)
      enrollments.push({ id: enrollmentId, studentId, groupId: toGroupId, startDate: date })
      return { enrollments, transfers: [{ id: transferId, studentId, fromGroupId, toGroupId, date, reason }, ...st.transfers] }
    })
    push(() => api.post('/transfers', { id: transferId, enrollmentId, studentId, fromGroupId, toGroupId, date, reason }))
  },

  addGroup: (g) => {
    const group: Group = { ...g, id: uid(), archived: false }
    set((st) => ({ groups: [...st.groups, group] }))
    push(() => api.post('/groups', group))
    return group.id
  },
  updateGroup: (id, patch) => {
    set((st) => ({ groups: patchById(st.groups, id, patch) }))
    push(() => api.patch(`/groups/${id}`, patch))
  },
  deleteGroup: (id) => {
    set((st) => ({
      groups: st.groups.filter((g) => g.id !== id),
      enrollments: st.enrollments.filter((e) => e.groupId !== id),
      attendance: Object.fromEntries(Object.entries(st.attendance).filter(([k]) => !k.startsWith(`${id}|`))),
    }))
    push(() => api.del(`/groups/${id}`))
  },

  addCourse: (c) => {
    const course: Course = { ...c, id: uid() }
    set((st) => ({ courses: [...st.courses, course] }))
    push(() => api.post('/courses', course))
  },
  updateCourse: (id, patch) => {
    set((st) => ({ courses: patchById(st.courses, id, patch) }))
    push(() => api.patch(`/courses/${id}`, clearable(patch, ['description'])))
  },
  deleteCourse: (id) => {
    set((st) => ({ courses: st.courses.filter((c) => c.id !== id) }))
    push(() => api.del(`/courses/${id}`))
  },

  addTeacher: (t) => {
    const teacher: Teacher = { ...t, id: uid(), createdAt: today() }
    set((st) => ({ teachers: [...st.teachers, teacher] }))
    push(() => api.post('/teachers', teacher))
  },
  updateTeacher: (id, patch) => {
    set((st) => ({ teachers: patchById(st.teachers, id, patch) }))
    push(() => api.patch(`/teachers/${id}`, patch))
  },
  deleteTeacher: (id) => {
    set((st) => ({ teachers: st.teachers.filter((t) => t.id !== id) }))
    push(() => api.del(`/teachers/${id}`))
  },

  setMark: (groupId, date, studentId, mark) => {
    set((st) => {
      const attendance = { ...st.attendance }
      const k = attKey(groupId, date, studentId)
      if (mark) attendance[k] = mark
      else delete attendance[k]
      return { attendance }
    })
    push(() => api.put('/attendance', { groupId, date, studentId, mark }))
  },
  setMarks: (groupId, date, studentIds, mark) => {
    set((st) => {
      const attendance = { ...st.attendance }
      for (const sid of studentIds) attendance[attKey(groupId, date, sid)] = mark
      return { attendance }
    })
    push(() => api.post('/attendance/bulk', { groupId, date, studentIds, mark }))
  },

  addPayment: (p) => {
    const payment: Payment = { ...p, id: uid() }
    set((st) => ({ payments: [payment, ...st.payments] }))
    push(() => api.post('/payments', payment))
  },
  deletePayment: (id) => {
    set((st) => ({ payments: st.payments.filter((p) => p.id !== id) }))
    push(() => api.del(`/payments/${id}`))
  },

  addLead: (l) => {
    const lead: Lead = { ...l, id: uid(), createdAt: today() }
    set((st) => ({ leads: [lead, ...st.leads] }))
    push(() => api.post('/leads', lead))
  },
  updateLead: (id, patch) => {
    set((st) => ({ leads: patchById(st.leads, id, patch) }))
    push(() => api.patch(`/leads/${id}`, clearable(patch, ['courseId', 'note'])))
  },
  deleteLead: (id) => {
    set((st) => ({ leads: st.leads.filter((l) => l.id !== id) }))
    push(() => api.del(`/leads/${id}`))
  },
  convertLead: (id, groupId) => {
    const lead = get().leads.find((l) => l.id === id)!
    const [firstName = '', ...rest] = lead.name.split(' ')
    const studentId = get().addStudent(
      { firstName, lastName: rest.join(' ') || '—', phone: lead.phone, parentName: '', parentPhone: '', status: 'active', discount: 0, source: lead.source, note: lead.note },
      groupId,
    )
    get().updateLead(id, { status: 'won' })
    return studentId
  },

  updateSettings: (patch) => {
    set((st) => ({ settings: { ...st.settings, ...patch } }))
    push(() => api.patch('/settings', patch))
  },

  importData: async (data) => {
    await queue // дождаться уже отправленных изменений
    await api.post('/import', data)
    await get().load()
  },
  resetDemo: async () => get().importData(createSeed()),
  clearAll: async () => get().importData(emptyData()),
}))
