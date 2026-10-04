import { cn } from '../../utils/cn.js';
import { DATE_RANGE_OPTIONS, defaultCustomRange } from '../../utils/dateRanges.js';

/**
 * value: { range, from?, to? }   onChange(newValue)
 * Same ranges as the server: This Month, Last Month, This Year, All Time, Custom.
 */
export default function DateRangeFilter({ value, onChange, className }) {
  const isCustom = value.range === 'custom';

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center', className)}>
      <div role="radiogroup" aria-label="Date range" className="flex overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {DATE_RANGE_OPTIONS.map((option) => {
          const active = value.range === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value === 'custom' ? defaultCustomRange() : { range: option.value })}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none',
                active ? 'bg-brand text-brand-contrast shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="From date"
            value={value.from ?? ''}
            max={value.to || undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            className="input-base w-auto"
          />
          <span className="text-sm text-gray-400">to</span>
          <input
            type="date"
            aria-label="To date"
            value={value.to ?? ''}
            min={value.from || undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className="input-base w-auto"
          />
        </div>
      )}
    </div>
  );
}