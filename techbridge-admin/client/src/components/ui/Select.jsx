import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';
import Field, { fieldMessageId } from './Field.jsx';

/**
 * Native select (best on mobile and for keyboard users).
 * <Select label="Status" options={[{ value: 'Active', label: 'Active' }]} {...register('status')} />
 */
const Select = forwardRef(function Select(
  { label, error, hint, id, required, options, placeholder, className, selectClassName, children, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <Field id={selectId} label={label} required={required} error={error} hint={hint} className={className}>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? fieldMessageId(selectId) : undefined}
        className={cn('input-base pr-9', error && 'border-danger focus:border-danger focus:ring-danger/30', selectClassName)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    </Field>
  );
});

export default Select;