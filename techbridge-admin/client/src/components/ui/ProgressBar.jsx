import { cn } from '../../utils/cn.js';

const BAR_TONES = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-gray-300',
  brand: 'bg-brand',
};

/** Payment progress. Colour follows the value unless a tone is given. */
export default function ProgressBar({ value = 0, tone, size = 'md', showLabel = true, label = 'Progress', className }) {
  const percent = Math.max(0, Number(value) || 0);
  const width = Math.min(percent, 100);
  const autoTone = tone ?? (percent >= 100 ? 'success' : percent >= 50 ? 'info' : percent > 0 ? 'warning' : 'neutral');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('w-full min-w-16 overflow-hidden rounded-full bg-gray-100', size === 'sm' ? 'h-1.5' : 'h-2')}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', BAR_TONES[autoTone])} style={{ width: `${width}%` }} />
      </div>
      {showLabel && <span className="w-11 shrink-0 text-right text-xs font-medium text-gray-600 tabular-nums">{Math.round(percent)}%</span>}
    </div>
  );
}