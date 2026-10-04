import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export default function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn('size-5 animate-spin text-current', className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-brand">
      <Spinner className="size-8" label={label} />
      <p className="text-sm text-gray-500">{label}...</p>
    </div>
  );
}