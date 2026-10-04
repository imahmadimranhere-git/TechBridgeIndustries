import { useId, useState } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import Field, { fieldMessageId } from './Field.jsx';
import Spinner from './Spinner.jsx';

/**
 * Searchable dropdown (Headless UI Combobox).
 * options: [{ value, label, description? }]; value is the selected option's value.
 * Pass onQueryChange to search on the server; otherwise options are filtered in the browser.
 * Use with react-hook-form through <Controller>.
 */
export default function SearchSelect({
  label,
  options = [],
  value,
  onChange,
  onQueryChange,
  placeholder = 'Search...',
  emptyText = 'No results',
  error,
  hint,
  required,
  loading = false,
  disabled = false,
  id,
  className,
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value) ?? null;
  const term = query.trim().toLowerCase();
  const visible =
    onQueryChange || !term
      ? options
      : options.filter((option) => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(term));

  return (
    <Field id={inputId} label={label} required={required} error={error} hint={hint} className={className}>
      <Combobox
        value={selected}
        by="value"
        onChange={(option) => onChange(option?.value ?? '')}
        onClose={() => setQuery('')}
        disabled={disabled}
        immediate
      >
        <div className="relative">
          <ComboboxInput
            id={inputId}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error || hint ? fieldMessageId(inputId) : undefined}
            className={cn('input-base pr-9', error && 'border-danger focus:border-danger focus:ring-danger/30')}
            displayValue={(option) => option?.label ?? ''}
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value);
              onQueryChange?.(event.target.value);
            }}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400" aria-label="Show options">
            {loading ? <Spinner className="size-4" /> : <ChevronsUpDown className="size-4" aria-hidden="true" />}
          </ComboboxButton>
        </div>

        <ComboboxOptions
          anchor="bottom start"
          transition
          className="z-50 mt-1 max-h-64 w-(--input-width) overflow-auto rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-lg transition duration-100 ease-out data-closed:opacity-0"
        >
          {visible.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">{loading ? 'Searching...' : emptyText}</div>
          ) : (
            visible.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option}
                className="group flex cursor-pointer items-start gap-2 rounded-md px-3 py-2 select-none data-focus:bg-brand-50"
              >
                <Check className="invisible mt-0.5 size-4 shrink-0 text-brand group-data-selected:visible" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="truncate text-gray-900">{option.label}</div>
                  {option.description && <div className="truncate text-xs text-gray-500">{option.description}</div>}
                </div>
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Combobox>
    </Field>
  );
}