import type { AttendanceMark, LeadStatus, PaymentMethod, StudentStatus, TimeSlot } from './types'
import type { BadgeTone } from '@/ui'

export const STUDENT_STATUS: Record<StudentStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Активный', tone: 'green' },
  frozen: { label: 'Заморожен', tone: 'outline' },
  left: { label: 'Ушёл', tone: 'red' },
}

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  click: 'Click',
  payme: 'Payme',
  transfer: 'Перечисление',
}

export const LEAD_STATUS: Record<LeadStatus, string> = {
  new: 'Новые',
  contacted: 'Связались',
  trial: 'Пробный урок',
  won: 'Записались',
  lost: 'Отказ',
}

export const MARK: Record<AttendanceMark, string> = {
  present: 'Был',
  absent: 'Не был',
  late: 'Опоздал',
  excused: 'Уважительная',
}

export const LEAD_SOURCES = ['Instagram', 'Telegram', 'Рекомендация', 'Сайт', 'Баннер', 'Другое']

export const TIME_SLOT: Record<TimeSlot, string> = {
  morning: 'Утро (до 12:00)',
  afternoon: 'День (12–17)',
  evening: 'Вечер (после 17)',
}
export const TIME_SLOT_SHORT: Record<TimeSlot, string> = { morning: 'утро', afternoon: 'день', evening: 'вечер' }
