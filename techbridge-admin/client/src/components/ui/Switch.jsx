import { Description, Field as HeadlessField, Label, Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '../../utils/cn.js';

/** On/off toggle with label and description, e.g. "Show stamp on invoices" */
export default function Switch({ checked, onChange, label, description, disabled = false, className }) {
  return (
    <HeadlessField disabled={disabled} className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {label && <Label className="text-sm font-medium text-gray-900">{label}</Label>}
        {description && <Description className="text-sm text-gray-500">{description}</Description>}
      </div>
      <HeadlessSwitch
        checked={checked}
        onChange={onChange}
        className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full bg-gray-200 transition-colors focus:outline-none data-checked:bg-brand data-disabled:cursor-not-allowed data-disabled:opacity-50 data-focus:ring-2 data-focus:ring-brand/40 data-focus:ring-offset-2"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none mt-0.5 ml-0.5 inline-block size-5 rounded-full bg-white shadow transition-transform group-data-checked:translate-x-5"
        />
      </HeadlessSwitch>
    </HeadlessField>
  );
}