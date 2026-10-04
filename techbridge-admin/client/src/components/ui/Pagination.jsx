import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// [1, 'gap', 4, 5, 6, 'gap', 12]
function pageWindow(page, pages) {
  const wanted = [...new Set([1, pages, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const items = [];
  let previous = 0;
  for (const p of wanted) {
    if (p - previous > 1) items.push(`gap-${p}`);
    items.push(p);
    previous = p;
  }
  return items;
}

function PageButton({ active, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums transition-colors',
        'focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-brand text-brand-contrast' : 'text-gray-600 hover:bg-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Works with the API's { page, limit, total, pages } */
export default function Pagination({ page, pages, total, limit, onPageChange, className }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav aria-label="Pagination" className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-900">{from}</span> to{' '}
        <span className="font-medium text-gray-900">{to}</span> of <span className="font-medium text-gray-900">{total}</span>
      </p>

      {pages > 1 && (
        <div className="flex items-center gap-1">
          <PageButton onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </PageButton>
          {pageWindow(page, pages).map((item) =>
            typeof item === 'string' ? (
              <span key={item} className="px-1 text-gray-400" aria-hidden="true">
                ...
              </span>
            ) : (
              <PageButton
                key={item}
                active={item === page}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </PageButton>
            )
          )}
          <PageButton onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
            <ChevronRight className="size-4" aria-hidden="true" />
          </PageButton>
        </div>
      )}
    </nav>
  );
}