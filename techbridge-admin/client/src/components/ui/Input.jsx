import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * Labelled input with an error message. Works with react-hook-form: <Input {...register('email')} />
 */
const Input = forwardRef(function Input(
  { label, error, hint, id, required, leftIcon: LeftIcon, rightElement, className, inputClassName, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'input-base',
            LeftIcon && 'pl-9',
            rightElement && 'pr-10',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            inputClassName
          )}
          {...props}
        />
        {rightElement && <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{rightElement}</div>}
      </div>

      {error ? (
        <p id={messageId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;