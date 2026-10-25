import { useState, type ReactNode } from 'react'
import { MARK_STYLE, MarkLegend } from '@/components/AttendanceGrid'
import { Balance } from '@/components/Money'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { currentMonth, WEEKDAYS_SHORT } from '@/lib/dates'
import { MARK as MARK_LABEL } from '@/store/labels'
import type { AttendanceMark } from '@/store/types'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Chips,
  ConfirmDialog,
  DatePicker,
  EmptyState,
  Icon,
  IconButton,
  Input,
  Menu,
  Modal,
  MoneyInput,
  PageHeader,
  PhoneInput,
  Select,
  StatCard,
  Table,
  Tabs,
  Textarea,
  toast,
  type Column,
  type IconName,
} from '@/ui'

const COLORS = [
  { name: 'primary', hex: '#F26A1C', cls: 'bg-primary' },
  { name: 'primary-hover', hex: '#E05C10', cls: 'bg-primary-hover' },
  { name: 'primary-active', hex: '#C94F0B', cls: 'bg-primary-active' },
  { name: 'primary-soft', hex: '#FFF1E8', cls: 'bg-primary-soft' },
  { name: 'primary-soft-2', hex: '#FFE1CD', cls: 'bg-primary-soft-2' },
  { name: 'ink', hex: '#141414', cls: 'bg-ink' },
  { name: 'muted', hex: '#6B6B6B', cls: 'bg-muted' },
  { name: 'subtle', hex: '#A1A1A1', cls: 'bg-subtle' },
  { name: 'line-strong', hex: '#DCDCDC', cls: 'bg-line-strong' },
  { name: 'line', hex: '#ECECEC', cls: 'bg-line' },
  { name: 'canvas', hex: '#F5F5F4', cls: 'bg-canvas' },
  { name: 'page', hex: '#F8F8F7', cls: 'bg-page' },
  { name: 'success', hex: '#1F9D55', cls: 'bg-success' },
  { name: 'success-soft', hex: '#E6F6EC', cls: 'bg-success-soft' },
  { name: 'danger', hex: '#D92D20', cls: 'bg-danger' },
  { name: 'danger-soft', hex: '#FDECEB', cls: 'bg-danger-soft' },
  { name: 'surface', hex: '#FFFFFF', cls: 'bg-surface' },
]

const ICONS: IconName[] = [
  'home', 'grid', 'user', 'users', 'userPlus', 'userX', 'graduation', 'book', 'layers', 'calendar', 'calendarCheck',
  'wallet', 'coins', 'card', 'money', 'percent', 'target', 'chart', 'clipboard', 'gear', 'search', 'filter', 'plus',
  'minus', 'close', 'check', 'chevronDown', 'chevronLeft', 'chevronRight', 'arrowLeft', 'arrowUpRight', 'transfer',
  'edit', 'trash', 'phone', 'message', 'clock', 'location', 'door', 'dots', 'download', 'logout', 'menu', 'eye', 'info',
]

const NAMES = ['Азизбек Каримов', 'Мадина Юсупова', 'Сардор Алиев', 'Шахзода Тошматова', 'Жасур Рахимов', 'Малика Мирзаева', 'Отабек Хасанов', 'Дильноза Каримова', 'Бекзод Назаров']

type Row = { id: string; name: string; group: string; balance: number }
const ROWS: Row[] = [
  { id: '1', name: 'Азизбек Каримов', group: 'IELTS Intensive', balance: -650000 },
  { id: '2', name: 'Мадина Юсупова', group: 'EN-Beginner A', balance: 0 },
  { id: '3', name: 'Сардор Алиев', group: 'Frontend #3', balance: 120000 },
]
const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Ученик', render: (r) => <div className="flex items-center gap-3"><Avatar seed={r.id} name={r.name} size={32} />{r.name}</div> },
  { key: 'group', header: 'Группа', render: (r) => <Badge tone="outline">{r.group}</Badge> },
  { key: 'balance', header: 'Баланс', align: 'right', render: (r) => <Balance value={r.balance} /> },
]

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 lg:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-lg">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export default function UiKit() {
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a')
  const [days, setDays] = useState([1, 3, 5])
  const [phone, setPhone] = useState('901234567')
  const [date, setDate] = useState('')
  const [pick, setPick] = useState('')
  const [student, setStudent] = useState('')
  const [sum, setSum] = useState(450000)
  const [month, setMonth] = useState(currentMonth())
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const [choice, setChoice] = useState('present')

  return (
    <>
      <PageHeader title="UI Kit" subtitle="Все компоненты из src/ui. Шрифт Manrope, палитра бренда, иконки из Figma." />

      <Section title="Цвета" description="Стандартная палитра Tailwind отключена. Доступны только эти токены. Зелёный и красный — только для статусов.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {COLORS.map((c) => (
            <div key={c.name} className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className={`h-16 ${c.cls}`} />
              <div className="px-3 py-2">
                <div className="text-[13px] font-medium">{c.name}</div>
                <div className="text-xs text-subtle">{c.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика" description="400 — текст, 500 — акценты, 600/700 — только заголовки страниц и ключевые цифры. Extrabold отключён.">
        <div className="flex flex-col gap-3">
          <div className="text-[28px] leading-tight font-semibold tracking-tight">Заголовок страницы · 28 / 600</div>
          <div className="text-[26px] leading-tight font-bold tracking-tight">48 250 000 сум · ключевая цифра · 26 / 700</div>
          <div className="text-lg font-medium">Заголовок модалки · 18 / 500</div>
          <div className="text-base font-medium">Заголовок карточки · 16 / 500</div>
          <div>Основной текст · 14 / 400</div>
          <div className="text-[13px] text-muted">Вторичный текст · 13 / 400</div>
          <div className="text-xs tracking-wide text-subtle uppercase">Подпись таблицы · 12 / 500</div>
        </div>
      </Section>

      <Section title="Кнопки">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="dark">Dark</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon="plus">Small</Button>
            <Button size="md" icon="wallet">Medium</Button>
            <Button size="lg" iconRight="arrowUpRight">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton icon="edit" label="Ghost" />
            <IconButton icon="transfer" label="Secondary" variant="secondary" />
            <IconButton icon="wallet" label="Soft" variant="soft" />
            <IconButton icon="plus" label="Primary" variant="primary" />
            <IconButton icon="trash" label="Small" size="sm" variant="secondary" />
          </div>
        </div>
      </Section>

      <Section title="Поля ввода">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Текст" placeholder="Введите имя" />
          <Input label="С иконкой" icon="search" placeholder="Поиск" />
          <PhoneInput label="Телефон" value={phone} onChange={setPhone} />
          <Input label="С суффиксом" suffix="сум" defaultValue="450 000" />
          <Select label="Выбор" placeholder="Выберите группу" value={pick} onChange={setPick} options={ROWS.map((r) => ({ value: r.id, label: r.group }))} />
          <Select label="Выбор с поиском" placeholder="Выберите ученика" value={student} onChange={setStudent} options={NAMES.map((n) => ({ value: n, label: n }))} />
          <Input label="С ошибкой" defaultValue="Ал" error="Минимум 3 символа" />
          <DatePicker label="Дата" value={date} onChange={setDate} />
          <MoneyInput label="Сумма (автоформат)" value={sum} onChange={setSum} />
          <Input label="С подсказкой" hint="Подсказка под полем" />
          <Textarea className="sm:col-span-2" label="Многострочный" placeholder="Заметка" />
        </div>
      </Section>

      <Section title="Выбор" description="Tabs — сегменты, Chips — мультивыбор.">
        <div className="flex flex-col gap-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'a', label: 'Активные', count: 42 }, { value: 'b', label: 'Должники', count: 7 }, { value: 'c', label: 'Все' }]} />
          <Chips options={WEEKDAYS_SHORT.map((label, i) => ({ value: i + 1, label }))} value={days} onChange={setDays} />
          <MonthSwitcher value={month} onChange={setMonth} />
        </div>
      </Section>

      <Section title="Бейджи и аватары" description="Ученики — DiceBear (стиль notionists, seed = id ученика). Преподаватели и прочее — инициалы.">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="orange">Orange</Badge>
            <Badge tone="soft" dot>Soft</Badge>
            <Badge tone="dark">Dark</Badge>
            <Badge tone="gray">Gray</Badge>
            <Badge tone="outline">Outline</Badge>
            <Badge tone="green" dot>Активный</Badge>
            <Badge tone="red" dot>Ушёл</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Avatar seed="s-1" name="Азизбек Каримов" size={28} />
            <Avatar seed="s-2" name="Мадина Юсупова" />
            <Avatar seed="s-3" name="Сардор Алиев" size={48} />
            <Avatar seed="s-4" name="Шахзода Алиева" size={64} />
            <span className="mx-2 h-10 w-px bg-line" />
            <Avatar name="Дилноза Каримова" />
            <Avatar name="Ойбек Рашидов" size={48} tone="dark" />
            <Avatar name="Inventum Center" size={64} tone="orange" />
          </div>
          <div className="flex flex-wrap gap-6">
            <Balance value={-650000} />
            <Balance value={0} />
            <Balance value={120000} />
          </div>
        </div>
      </Section>

      <Section title="Посещаемость" description="Отметки в сетке посещаемости.">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(Object.keys(MARK_STYLE) as AttendanceMark[]).map((m) => (
              <span key={m} className={`inline-flex size-8 items-center justify-center rounded-lg ${MARK_STYLE[m].cls}`}>
                <Icon name={MARK_STYLE[m].icon} size={15} stroke={2.2} />
              </span>
            ))}
            <span className="inline-flex size-8 rounded-lg border border-dashed border-line-strong" />
          </div>
          <MarkLegend />
        </div>
      </Section>

      <Section title="Карточки">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard accent icon="coins" label="Доход за месяц" value="48 250 000 сум" hint="+12% к прошлому месяцу" />
          <StatCard icon="users" label="Активные ученики" value="51" hint="в 7 группах" />
          <Card>
            <CardHeader title="Карточка" subtitle="С заголовком и действием" actions={<Button size="sm" variant="ghost" iconRight="chevronRight">Все</Button>} />
            <p className="text-muted">Контент карточки.</p>
          </Card>
        </div>
      </Section>

      <Section title="Таблица">
        <Card padded={false}>
          <Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} onRowClick={(r) => toast(r.name)} />
        </Card>
      </Section>

      <Section title="Пустое состояние">
        <Card>
          <EmptyState icon="users" title="Ученики не найдены" text="Измените фильтры или добавьте нового ученика." action={<Button icon="plus">Добавить</Button>} />
        </Card>
      </Section>

      <Section title="Оверлеи" description="Модалка, подтверждение, уведомление и выпадающее меню (клавиши 1–9, стрелки, Esc).">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setModal(true)}>Модальное окно</Button>
          <Button variant="secondary" onClick={() => setConfirm(true)}>Подтверждение</Button>
          <Button variant="secondary" onClick={() => toast('Оплата 450 000 сум принята')}>Уведомление</Button>
          <Button variant="secondary" iconRight="chevronDown" onClick={(e) => setMenu(e.currentTarget.getBoundingClientRect())}>Меню: {MARK_LABEL[choice as AttendanceMark]}</Button>
        </div>
      </Section>

      <Section title="Иконки" description={`${ICONS.length} иконок из Figma, стиль Linear. Добавляются в src/ui/icons.tsx.`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-8">
          {ICONS.map((n) => (
            <div key={n} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-2 py-3">
              <Icon name={n} size={22} />
              <span className="max-w-full truncate text-[11px] text-muted">{n}</span>
            </div>
          ))}
        </div>
      </Section>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Модальное окно"
        description="Закрывается по Esc или клику по фону"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Отмена</Button><Button onClick={() => setModal(false)}>Сохранить</Button></>}
      >
        <Input label="Поле" placeholder="Текст" autoFocus />
      </Modal>
      <Menu
        anchor={menu}
        onClose={() => setMenu(null)}
        title="Выберите отметку"
        items={(Object.keys(MARK_STYLE) as AttendanceMark[]).map((m, i) => ({
          key: m,
          label: MARK_LABEL[m],
          hint: String(i + 1),
          active: choice === m,
          icon: <span className={`inline-flex size-6 items-center justify-center rounded-md ${MARK_STYLE[m].cls}`}><Icon name={MARK_STYLE[m].icon} size={13} stroke={2.4} /></span>,
          onSelect: () => setChoice(m),
        }))}
      />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Удалить запись?" text="Это действие нельзя отменить." onConfirm={() => toast('Удалено')} />
    </>
  )
}
