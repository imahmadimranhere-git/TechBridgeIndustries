import { cn } from '../../utils/cn.js';
import EmptyState from './EmptyState.jsx';

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

/**
 * columns: [{ key, header, render?(row, index), align?: 'left'|'center'|'right', className?, headerClassName? }]
 * Money columns: align: 'right' (adds tabular-nums so digits line up).
 */
export default function Table({
  columns,
  rows = [],
  rowKey = '_id',
  loading = false,
  skeletonRows = 5,
  emptyState,
  onRowClick,
  caption,
  maxHeight = 'max-h-[70vh]',
  className,
}) {
  const clickable = Boolean(onRowClick);

  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white', className)}>
      {/* Scrolls sideways on small screens and vertically inside, so the header can stick */}
      <div className={cn('overflow-auto', maxHeight)}>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-gray-500 uppercase',
                    ALIGN[column.align ?? 'left'],
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState ?? <EmptyState compact title="Nothing here yet" />}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row[rowKey] ?? index}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === 'Enter') onRowClick(row);
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  className={cn(
                    'transition-colors even:bg-gray-50/60 hover:bg-brand-50/60',
                    clickable && 'cursor-pointer focus-visible:bg-brand-50 focus-visible:outline-none'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 whitespace-nowrap text-gray-700',
                        ALIGN[column.align ?? 'left'],
                        column.align === 'right' && 'tabular-nums',
                        column.className
                      )}
                    >
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}