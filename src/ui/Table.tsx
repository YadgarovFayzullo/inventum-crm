import { memo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Column<T> = {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  width?: number | string
  align?: 'left' | 'right' | 'center'
}

type TableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
}

function TableInner<T>({ columns, rows, rowKey, onRowClick, empty }: TableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width, textAlign: c.align ?? 'left' }}
                className="sticky top-0 border-b border-line bg-surface px-4 py-3 text-xs tracking-wide whitespace-nowrap text-subtle uppercase"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn('border-b border-line last:border-0', onRowClick && 'cursor-pointer transition-colors hover:bg-surface-2')}
            >
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align }} className="px-4 py-3 align-middle">
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const Table = memo(TableInner) as typeof TableInner
