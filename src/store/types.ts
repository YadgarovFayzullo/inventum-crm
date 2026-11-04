export type ID = string

export type StudentStatus = 'active' | 'frozen' | 'left'

export interface Student {
  id: ID
  firstName: string
  lastName: string
  phone: string // 9 цифр без +998
  parentName: string
  parentPhone: string
  birthDate?: string
  source?: string
  note?: string
  status: StudentStatus
  discount: number // % скидки на все группы
  createdAt: string
  /** 0 — фото нет; растёт при каждой загрузке и входит в адрес картинки (кэш браузера) */
  photoVersion?: number
}

export interface Course {
  id: ID
  name: string
  price: number // базовая цена в месяц
  durationMonths: number
  description?: string
}

export interface Teacher {
  id: ID
  firstName: string
  lastName: string
  phone: string
  subject: string
  salaryPercent: number // % от оплат учеников его групп
  createdAt: string
}

export interface Group {
  id: ID
  name: string
  courseId: ID
  teacherId: ID
  days: number[] // ISO: 1 = Пн … 7 = Вс
  timeStart: string
  timeEnd: string
  room: string
  price: number // в месяц
  capacity: number
  startDate: string
  archived: boolean
}

/** Нахождение ученика в группе за период. Перевод = закрытие одного и открытие другого. */
export interface Enrollment {
  id: ID
  studentId: ID
  groupId: ID
  startDate: string
  endDate?: string // последний день в группе (включительно)
}

export interface Transfer {
  id: ID
  studentId: ID
  fromGroupId: ID
  toGroupId: ID
  date: string
  reason?: string
}

export type AttendanceMark = 'present' | 'absent' | 'late' | 'excused'

export type PaymentMethod = 'cash' | 'card' | 'click' | 'payme' | 'transfer'

export interface Payment {
  id: ID
  studentId: ID
  groupId: ID
  amount: number
  method: PaymentMethod
  date: string
  comment?: string
}

export type LeadStatus = 'new' | 'contacted' | 'trial' | 'won' | 'lost'

export interface Lead {
  id: ID
  name: string
  phone: string
  courseId?: ID
  source: string
  status: LeadStatus
  note?: string
  createdAt: string
}

export interface Settings {
  centerName: string
}

export type FinanceKind = 'income' | 'expense'

export const INCOME_CATEGORIES = ['Оплата обучения', 'Аренда помещений', 'Продажа материалов', 'Спонсорство и гранты', 'Прочие доходы', 'Другое'] as const
export const EXPENSE_CATEGORIES = ['Аренда', 'Зарплаты', 'Коммунальные услуги', 'Маркетинг и реклама', 'Налоги', 'Оборудование и мебель', 'Канцелярия и материалы', 'Прочие расходы', 'Другое'] as const

/** Строка финансового журнала. Оплаты учеников попадают в него автоматически (source = 'payment'). */
export interface FinanceEntry {
  id: ID
  kind: FinanceKind
  source: 'manual' | 'payment'
  amount: number
  date: string
  category: string
  /** Почему доход или расход: у ручных записей обязателен */
  description: string
  method?: PaymentMethod
  /** Если запись внесена из регулярного расхода */
  recurringId?: ID
}

/** Регулярный расход: повторяется каждый месяц с startMonth по endMonth (без endMonth — бессрочно) */
export interface RecurringExpense {
  id: ID
  category: string
  description: string
  amount: number
  /** День месяца (в коротких месяцах — последний день) */
  day: number
  startMonth: string
  endMonth?: string
}

export interface MonthlyFinance {
  month: string
  income: number
  expense: number
  planned: number
}
