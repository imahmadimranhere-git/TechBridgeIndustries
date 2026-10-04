import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import Button from './Button.jsx';

/**
 * "Are you sure?" dialog for deletes and overpayment warnings.
 * tone="danger" (red) or "primary" (brand colour).
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  const danger = tone === 'danger';
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose} className="relative z-50">
      <DialogBackdrop transition className="fixed inset-0 bg-gray-900/40 transition-opacity duration-200 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          <div className="flex gap-4">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                danger ? 'bg-danger-soft text-danger' : 'bg-brand-50 text-brand'
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">{title}</DialogTitle>
              {message && <div className="mt-1.5 text-sm text-gray-600">{message}</div>}
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}