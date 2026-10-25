import { addDays, addMonths, currentMonth, daysInMonth, today } from '@/lib/dates'
import { enrollmentCharges } from './billing'
import { lessonDates } from './schedule'
import type { AttendanceMark, Course, Enrollment, Group, Lead, Payment, PaymentMethod, Student, Teacher, Transfer } from './types'
import type { Data } from './store'

// Детерминированный генератор — демо-данные одинаковые при каждом сбросе
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const MALE = ['Азизбек', 'Жасур', 'Сардор', 'Бекзод', 'Жавохир', 'Отабек', 'Шохрух', 'Диёрбек', 'Шерзод', 'Улугбек', 'Ислом', 'Камрон', 'Абдулла', 'Тимур', 'Фаррух']
const FEMALE = ['Мадина', 'Малика', 'Нилуфар', 'Севара', 'Дильноза', 'Зарина', 'Шахзода', 'Мохинур', 'Сабина', 'Гулноза']
const LAST = ['Каримов', 'Рахимов', 'Тошматов', 'Юсупов', 'Алиев', 'Абдуллаев', 'Эргашев', 'Назаров', 'Саидов', 'Кадыров', 'Мирзаев', 'Хасанов']
const PARENT = ['Бахтиёр', 'Рустам', 'Ильхом', 'Фарход', 'Акмал', 'Дилшод', 'Нодира', 'Гульнора', 'Феруза', 'Шахноза']
const OPERATORS = ['90', '91', '93', '94', '97', '99', '88', '33']

export function createSeed(): Data {
  const r = rng(42)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]!
  const phone = () => pick(OPERATORS) + String(Math.floor(r() * 1e7)).padStart(7, '0')
  const now = today()
  const cm = currentMonth()

  const courses: Course[] = [
    { id: 'c-en', name: 'Английский язык', price: 450000, durationMonths: 9, description: 'General English, уровни A1–B2' },
    { id: 'c-ielts', name: 'IELTS', price: 650000, durationMonths: 4, description: 'Подготовка к IELTS 6.5+' },
    { id: 'c-math', name: 'Математика', price: 400000, durationMonths: 9, description: 'Школьная программа и олимпиады' },
    { id: 'c-fe', name: 'Frontend-разработка', price: 800000, durationMonths: 6, description: 'HTML, CSS, JavaScript, React' },
    { id: 'c-ru', name: 'Русский язык', price: 350000, durationMonths: 6 },
  ]

  const teachers: Teacher[] = [
    { id: 't-1', firstName: 'Дилноза', lastName: 'Каримова', phone: phone(), subject: 'Английский язык', salaryPercent: 40, createdAt: addDays(now, -400) },
    { id: 't-2', firstName: 'Жахонгир', lastName: 'Усмонов', phone: phone(), subject: 'IELTS', salaryPercent: 45, createdAt: addDays(now, -300) },
    { id: 't-3', firstName: 'Ойбек', lastName: 'Рашидов', phone: phone(), subject: 'Математика', salaryPercent: 40, createdAt: addDays(now, -500) },
    { id: 't-4', firstName: 'Санжар', lastName: 'Алимов', phone: phone(), subject: 'Frontend', salaryPercent: 50, createdAt: addDays(now, -200) },
    { id: 't-5', firstName: 'Наталья', lastName: 'Ким', phone: phone(), subject: 'Русский язык', salaryPercent: 40, createdAt: addDays(now, -350) },
  ]

  const start = (monthsAgo: number, day = 1) => `${addMonths(cm, -monthsAgo)}-${String(day).padStart(2, '0')}`
  const groups: Group[] = [
    { id: 'g-1', name: 'EN-Beginner A', courseId: 'c-en', teacherId: 't-1', days: [1, 3, 5], timeStart: '09:00', timeEnd: '10:30', room: '101', price: 450000, capacity: 12, startDate: start(4, 2), archived: false },
    { id: 'g-2', name: 'EN-Intermediate', courseId: 'c-en', teacherId: 't-1', days: [2, 4, 6], timeStart: '16:00', timeEnd: '17:30', room: '101', price: 450000, capacity: 12, startDate: start(3, 1), archived: false },
    { id: 'g-3', name: 'IELTS Intensive', courseId: 'c-ielts', teacherId: 't-2', days: [1, 3, 5], timeStart: '18:00', timeEnd: '19:30', room: '203', price: 650000, capacity: 10, startDate: start(2, 3), archived: false },
    { id: 'g-4', name: 'Математика 7–9', courseId: 'c-math', teacherId: 't-3', days: [2, 4], timeStart: '14:00', timeEnd: '15:30', room: '102', price: 400000, capacity: 14, startDate: start(4, 5), archived: false },
    { id: 'g-5', name: 'Frontend #3', courseId: 'c-fe', teacherId: 't-4', days: [1, 3, 5], timeStart: '14:00', timeEnd: '16:00', room: 'IT-lab', price: 800000, capacity: 10, startDate: start(2, 10), archived: false },
    { id: 'g-6', name: 'Frontend #4', courseId: 'c-fe', teacherId: 't-4', days: [2, 4, 6], timeStart: '18:00', timeEnd: '20:00', room: 'IT-lab', price: 800000, capacity: 10, startDate: start(1, 4), archived: false },
    { id: 'g-7', name: 'Русский язык B1', courseId: 'c-ru', teacherId: 't-5', days: [6, 7], timeStart: '10:00', timeEnd: '11:30', room: '102', price: 350000, capacity: 12, startDate: start(3, 8), archived: false },
  ]

  const students: Student[] = []
  const enrollments: Enrollment[] = []
  const transfers: Transfer[] = []
  const groupFill = [9, 8, 7, 10, 6, 5, 6]

  let n = 0
  groups.forEach((g, gi) => {
    for (let i = 0; i < groupFill[gi]!; i++) {
      const female = r() < 0.45
      const last = pick(LAST)
      const id = `s-${++n}`
      const enrollStart = r() < 0.7 ? g.startDate : addDays(g.startDate, Math.floor(r() * 40))
      const st: Student = {
        id,
        firstName: female ? pick(FEMALE) : pick(MALE),
        lastName: female ? last + 'а' : last,
        phone: phone(),
        parentName: `${pick(PARENT)} ${last}`,
        parentPhone: phone(),
        birthDate: `${2006 + Math.floor(r() * 10)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
        source: pick(['Instagram', 'Telegram', 'Рекомендация', 'Сайт']),
        status: r() < 0.06 ? 'frozen' : 'active',
        discount: r() < 0.12 ? pick([10, 15, 20]) : 0,
        createdAt: enrollStart,
      }
      students.push(st)
      enrollments.push({ id: `e-${n}`, studentId: id, groupId: g.id, startDate: enrollStart < now ? enrollStart : now })
    }
  })

  // Пара учеников занимается в двух группах
  enrollments.push({ id: 'e-x1', studentId: 's-3', groupId: 'g-4', startDate: start(2, 1) })
  enrollments.push({ id: 'e-x2', studentId: 's-12', groupId: 'g-7', startDate: start(1, 1) })

  // Пример перевода: из Beginner в Intermediate
  const moveDate = start(1, 15)
  const moved = enrollments.find((e) => e.studentId === 's-2')!
  moved.endDate = addDays(moveDate, -1)
  enrollments.push({ id: 'e-t1', studentId: 's-2', groupId: 'g-2', startDate: moveDate })
  transfers.push({ id: 'tr-1', studentId: 's-2', fromGroupId: 'g-1', toGroupId: 'g-2', date: moveDate, reason: 'Повысил уровень' })

  // Один ушедший ученик
  const leftStudent = students.find((s) => s.id === 's-20')!
  leftStudent.status = 'left'
  enrollments.find((e) => e.studentId === 's-20')!.endDate = start(1, 20)

  // Оплаты: большинство платит в начале месяца, часть — должники
  const methods: PaymentMethod[] = ['cash', 'cash', 'card', 'click', 'payme', 'payme', 'transfer']
  const payments: Payment[] = []
  const groupById = new Map(groups.map((g) => [g.id, g]))
  const studentById = new Map(students.map((s) => [s.id, s]))
  let p = 0
  for (const e of enrollments) {
    const g = groupById.get(e.groupId)!
    const s = studentById.get(e.studentId)!
    for (const c of enrollmentCharges(e, g.price, s.discount)) {
      const isCurrent = c.month === cm
      const chance = isCurrent ? 0.75 : 0.93
      if (r() > chance) continue
      const maxDay = isCurrent ? Math.min(Number(now.slice(8)), 10) : Math.min(10, daysInMonth(c.month))
      let date = `${c.month}-${String(1 + Math.floor(r() * maxDay)).padStart(2, '0')}`
      if (date < e.startDate) date = e.startDate
      if (date > now) date = now
      const partial = r() < 0.08
      payments.push({
        id: `p-${++p}`,
        studentId: e.studentId,
        groupId: e.groupId,
        amount: partial ? Math.round(c.amount / 2 / 1000) * 1000 : c.amount,
        method: pick(methods),
        date,
      })
    }
  }
  payments.sort((a, b) => (a.date < b.date ? 1 : -1))

  // Посещаемость за последние ~2 месяца до сегодня
  const attendance: Record<string, AttendanceMark> = {}
  const from = addMonths(cm, -2)
  for (const g of groups) {
    for (let m = from; m <= cm; m = addMonths(m, 1)) {
      for (const d of lessonDates(g, m)) {
        if (d > now) continue
        for (const e of enrollments) {
          if (e.groupId !== g.id || e.startDate > d || (e.endDate && e.endDate < d)) continue
          const x = r()
          attendance[`${g.id}|${d}|${e.studentId}`] = x < 0.84 ? 'present' : x < 0.92 ? 'absent' : x < 0.97 ? 'late' : 'excused'
        }
      }
    }
  }

  const leads: Lead[] = [
    { id: 'l-1', name: 'Анвар Холматов', phone: phone(), courseId: 'c-ielts', source: 'Instagram', status: 'new', createdAt: now },
    { id: 'l-2', name: 'Лола Азимова', phone: phone(), courseId: 'c-en', source: 'Telegram', status: 'new', createdAt: addDays(now, -1) },
    { id: 'l-3', name: 'Бобур Султанов', phone: phone(), courseId: 'c-fe', source: 'Сайт', status: 'contacted', note: 'Перезвонить вечером', createdAt: addDays(now, -2) },
    { id: 'l-4', name: 'Камила Турсунова', phone: phone(), courseId: 'c-math', source: 'Рекомендация', status: 'contacted', createdAt: addDays(now, -3) },
    { id: 'l-5', name: 'Даврон Исмоилов', phone: phone(), courseId: 'c-fe', source: 'Instagram', status: 'trial', note: 'Пробный в субботу', createdAt: addDays(now, -4) },
    { id: 'l-6', name: 'Сардора Ахмедова', phone: phone(), courseId: 'c-en', source: 'Баннер', status: 'trial', createdAt: addDays(now, -5) },
    { id: 'l-7', name: 'Жамшид Носиров', phone: phone(), courseId: 'c-ru', source: 'Telegram', status: 'lost', note: 'Дорого', createdAt: addDays(now, -9) },
    { id: 'l-8', name: 'Фарида Юлдашева', phone: phone(), courseId: 'c-ielts', source: 'Instagram', status: 'won', createdAt: addDays(now, -12) },
  ]

  return { students, courses, teachers, groups, enrollments, transfers, attendance, payments, leads, settings: { centerName: 'INVENTUM' } }
}
