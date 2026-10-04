import { cn } from '../../utils/cn.js';

const STAMP_TONES = {
  Paid: 'text-success',
  Received: 'text-success',
  'Partially Paid': 'text-warning',
  Overdue: 'text-danger',
  Completed: 'text-info',
  Draft: 'text-neutral',
  Cancelled: 'text-neutral',
};

const SIZES = {
  sm: 'border-2 px-2 py-0.5 text-[10px] tracking-[0.15em]',
  md: 'border-[3px] px-3 py-1 text-sm tracking-[0.2em]',
  lg: 'border-4 px-5 py-2 text-2xl tracking-[0.25em]',
};

/** Rubber-stamp look on screen, matching the PDF stamps. Unknown statuses render nothing. */
export default function StatusStamp({ status, size = 'md', className }) {
  const tone = STAMP_TONES[status];
  if (!tone) return null;

  return (
    <span
      aria-label={`Status: ${status}`}
      className={cn(
        'inline-block -rotate-12 rounded-lg border-double border-current font-bold uppercase opacity-85 mix-blend-multiply select-none',
        SIZES[size],
        tone,
        className
      )}
    >
      {status}
    </span>
  );
}