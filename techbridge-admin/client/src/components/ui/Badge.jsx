import { cn } from '../../utils/cn.js';
import { statusTone } from '../../utils/status.js';

const TONES = {
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  info: 'bg-info-soft text-info ring-info/20',
  purple: 'bg-purple-soft text-purple ring-purple/20',
  neutral: 'bg-neutral-soft text-gray-600 ring-gray-500/20',
  brand: 'bg-brand-50 text-brand ring-brand/20',
};

const DOTS = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  purple: 'bg-purple',
  neutral: 'bg-gray-400',
  brand: 'bg-brand',
};

export default function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone],
        className
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** <StatusBadge status="Overdue" /> picks the colour automatically */
export function StatusBadge({ status, className }) {
  if (!status) return null;
  return (
    <Badge tone={statusTone(status)} dot className={className}>
      {status}
    </Badge>
  );
}