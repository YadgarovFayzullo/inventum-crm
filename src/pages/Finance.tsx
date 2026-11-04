import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import { currentMonth, formatDate, formatMonth, monthEnd, monthStart } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { FinanceEntryModal } from '@/components/FinanceEntryModal'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { PAYMENT_METHOD } from '@/store/labels'
import type { FinanceEntry, FinanceKind } from '@/store/types'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, IconButton, Input, PageHeader, StatCard, Table, Tabs, toast, type Column } from '@/ui'

type Filter = 'all' | FinanceKind

/** Разбивка по категориям с долей от итога */
function Breakdown({ title, rows, total, tone }: { title: string; rows: [string, number][]; total: number; tone: 'green' | 'red' }) {
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <p className="text-muted">За этот месяц записей нет</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(([name, sum]) => (
            <li key={name}>
              <div className="mb-1 flex justify-between gap-3 text-[13px]">
                <span className="truncate">{name}</span>
                <span className="font-medium whitespace-nowrap">{formatMoney(sum)} <span className="text-subtle">· {Math.round((sum / total) * 100)}%</span></span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                <div className={tone === 'green' ? 'h-full rounded-full bg-success' : 'h-full rounded-full bg-danger'} style={{ width: `${(sum / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Finance() {
  const [month, setMonth] = useState(currentMonth())
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<FinanceEntry | null | undefined>(undefined) // undefined — закрыто, null — новая запись
  const [toDelete, setToDelete] = useState<FinanceEntry | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const r = await api.get<{ entries: FinanceEntry[] }>(`/finance?from=${monthStart(month)}&to=${monthEnd(month)}`)
      setEntries(r.entries)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [month])
  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const report = useMemo(() => {
    const byCat = (kind: FinanceKind) => {
      const m = new Map<string, number>()
      for (const e of entries) if (e.kind === kind) m.set(e.category, (m.get(e.category) ?? 0) + e.amount)
      return [...m.entries()].sort((a, b) => b[1] - a[1])
    }
    const income = entries.reduce((a, e) => a + (e.kind === 'income' ? e.amount : 0), 0)
    const expense = entries.reduce((a, e) => a + (e.kind === 'expense' ? e.amount : 0), 0)
    return { income, expense, profit: income - expense, incomeRows: byCat('income'), expenseRows: byCat('expense') }
  }, [entries])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return entries.filter((e) => (filter === 'all' || e.kind === filter) && (!t || `${e.description} ${e.category}`.toLowerCase().includes(t)))
  }, [entries, filter, q])

  const columns: Column<FinanceEntry>[] = [
    { key: 'date', header: 'Дата', render: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span> },
    { key: 'kind', header: 'Тип', render: (e) => <Badge tone={e.kind === 'income' ? 'green' : 'red'}>{e.kind === 'income' ? 'Доход' : 'Расход'}</Badge> },
    { key: 'category', header: 'Категория', render: (e) => e.category },
    { key: 'description', header: 'Почему', render: (e) => <span className="block max-w-md min-w-56">{e.description}</span> },
    { key: 'method', header: 'Способ', render: (e) => (e.method ? <span className="text-muted">{PAYMENT_METHOD[e.method]}</span> : '') },
    {
      key: 'amount',
      header: 'Сумма',
      align: 'right',
      render: (e) => <span className={`font-medium whitespace-nowrap ${e.kind === 'income' ? 'text-success' : ''}`}>{e.kind === 'income' ? '+' : '−'}{formatMoney(e.amount)}</span>,
    },
    {
      key: 'x',
      header: '',
      width: 96,
      render: (e) =>
        e.source === 'manual' ? (
          <div className="flex justify-end">
            <IconButton icon="edit" size="sm" label="Изменить" onClick={() => setEditing(e)} />
            <IconButton icon="trash" size="sm" label="Удалить" onClick={() => setToDelete(e)} />
          </div>
        ) : null, // оплаты учеников меняются на странице «Оплаты»
    },
  ]

  const exportCsv = () =>
    downloadCsv(`финансы-${month}.csv`, [
      ['Дата', 'Тип', 'Категория', 'Почему', 'Способ', 'Сумма'],
      ...rows.map((e) => [e.date, e.kind === 'income' ? 'Доход' : 'Расход', e.category, e.description, e.method ? PAYMENT_METHOD[e.method] : '', e.kind === 'income' ? e.amount : -e.amount]),
      [],
      ['', '', '', 'Доходы', '', report.income],
      ['', '', '', 'Расходы', '', -report.expense],
      ['', '', '', 'Итог', '', report.profit],
    ])

  return (
    <>
      <PageHeader
        title="Финансы"
        subtitle="Доходы и расходы центра с причиной каждой записи"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exportCsv}>Экспорт</Button>
            <Button icon="plus" onClick={() => setEditing(null)}>Добавить запись</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[{ value: 'all', label: 'Все' }, { value: 'income', label: 'Доходы' }, { value: 'expense', label: 'Расходы' }]}
        />
        <Input className="min-w-56 flex-1" icon="search" placeholder="Поиск по описанию или категории" value={q} onChange={(e) => setQ(e.target.value)} />
        <MonthSwitcher value={month} onChange={setMonth} />
      </div>

      {failed ? (
        <Card><EmptyState icon="info" title="Не удалось загрузить данные" action={<Button onClick={() => void load()}>Повторить</Button>} /></Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard icon="coins" label={`Доходы · ${formatMonth(month)}`} value={formatMoney(report.income)} hint={`${entries.filter((e) => e.kind === 'income').length} записей`} />
            <StatCard icon="wallet" label="Расходы" value={formatMoney(report.expense)} hint={`${entries.filter((e) => e.kind === 'expense').length} записей`} />
            <StatCard accent icon="chart" label={report.profit >= 0 ? 'Прибыль' : 'Убыток'} value={formatMoney(report.profit)} hint={report.income ? `Рентабельность ${Math.round((report.profit / report.income) * 100)}%` : undefined} />
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Breakdown title="Откуда доходы" rows={report.incomeRows} total={report.income} tone="green" />
            <Breakdown title="На что расходы" rows={report.expenseRows} total={report.expense} tone="red" />
          </div>

          <Card padded={false}>
            {loading ? <div className="h-40" /> : <Table columns={columns} rows={rows} rowKey={(e) => e.id} empty={<EmptyState icon="wallet" title="Записей за этот период нет" />} />}
          </Card>
        </>
      )}

      <FinanceEntryModal open={editing !== undefined} onClose={() => setEditing(undefined)} entry={editing ?? undefined} onSaved={() => void load()} />
      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Удалить запись?"
        text="Она исчезнет из отчёта."
        onConfirm={async () => {
          try {
            await api.del(`/finance/entries/${toDelete!.id}`)
            toast('Запись удалена')
            void load()
          } catch {
            toast('Не удалось удалить')
          }
        }}
      />
    </>
  )
}
