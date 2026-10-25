import { memoRefs } from '@/lib/memo'
import { computeBalances, EMPTY_BALANCE } from './billing'
import { useStore } from './store'
import type { Course, Enrollment, Group, ID, Student, Teacher } from './types'

const byId = <T extends { id: ID }>(list: T[]) => new Map(list.map((x) => [x.id, x]))

const groupMap = memoRefs((l: Group[]) => byId(l))
const courseMap = memoRefs((l: Course[]) => byId(l))
const teacherMap = memoRefs((l: Teacher[]) => byId(l))
const studentMap = memoRefs((l: Student[]) => byId(l))

export const useGroupMap = () => groupMap(useStore((s) => s.groups))
export const useCourseMap = () => courseMap(useStore((s) => s.courses))
export const useTeacherMap = () => teacherMap(useStore((s) => s.teachers))
export const useStudentMap = () => studentMap(useStore((s) => s.students))

const groupBy = (list: Enrollment[], key: 'groupId' | 'studentId') => {
  const m = new Map<ID, Enrollment[]>()
  for (const e of list) {
    const arr = m.get(e[key])
    if (arr) arr.push(e)
    else m.set(e[key], [e])
  }
  return m
}
const byGroup = memoRefs((l: Enrollment[]) => groupBy(l, 'groupId'))
const byStudent = memoRefs((l: Enrollment[]) => groupBy(l, 'studentId'))

const NONE: Enrollment[] = []
export const useEnrollmentsByGroup = () => byGroup(useStore((s) => s.enrollments))
export const useEnrollmentsByStudent = () => byStudent(useStore((s) => s.enrollments))
export const enrollmentsOf = (m: Map<ID, Enrollment[]>, id: ID) => m.get(id) ?? NONE

export function useBalances() {
  const students = useStore((s) => s.students)
  const groups = useStore((s) => s.groups)
  const enrollments = useStore((s) => s.enrollments)
  const payments = useStore((s) => s.payments)
  return computeBalances(students, groups, enrollments, payments)
}

export { EMPTY_BALANCE }
