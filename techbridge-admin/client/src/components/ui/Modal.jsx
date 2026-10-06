import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/**
 * Accessible popup: focus is trapped inside, Esc and the backdrop close it.
 * Bottom sheet on phones, centred dialog on larger screens.
 * For a form inside, give the <form> an id and the footer button form="that-id".
 */
export default function Modal({ open, onClose, title, description, size = 'md', footer, children }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-200 data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
          <DialogPanel
            transition
            className={cn(
              'w-full rounded-t-2xl bg-white shadow-xl transition duration-200 ease-out sm:rounded-2xl',
              'data-closed:translate-y-6 data-closed:opacity-0 sm:data-closed:translate-y-0 sm:data-closed:scale-95',
              SIZES[size]
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-gray-900">{title}</DialogTitle>
                {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-gray-100 bg-gray-50/70 px-5 py-3 sm:flex-row sm:justify-end">
                {footer}
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}