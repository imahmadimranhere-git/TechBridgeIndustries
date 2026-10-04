import { cn } from '../../utils/cn.js';

const ICON_TONES = {
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  purple: 'bg-purple-soft text-purple',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-neutral',
  brand: 'bg-brand-50 text-brand',
};

const ACCENTS = {
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  purple: 'bg-purple',
  danger: 'bg-danger',
  neutral: 'bg-neutral',
  brand: 'bg-brand',
};

/**
 * Money/number card. size="lg" for the four main dashboard cards
 * (blue = info, orange = warning, green = success, purple = purple).
 */
export default function StatCard({ title, value, icon: Icon, tone = 'brand', hint, size = 'md', loading = false, className }) {
  const large = size === 'lg';

  return (
    <div className={cn('card relative overflow-hidden', large ? 'p-6' : 'p-5', className)}>
      <span className={cn('absolute inset-x-0 top-0 h-1', ACCENTS[tone])} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className={cn('mt-2 animate-pulse rounded bg-gray-100', large ? 'h-9 w-40' : 'h-7 w-28')} />
          ) : (
            <p className={cn('mt-1 font-semibold tracking-tight text-gray-900 tabular-nums', large ? 'text-2xl sm:text-3xl' : 'text-xl')}>
              {value}
            </p>
          )}
          {hint && !loading && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('flex shrink-0 items-center justify-center rounded-xl', large ? 'size-12' : 'size-10', ICON_TONES[tone])}>
            <Icon className={large ? 'size-6' : 'size-5'} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}