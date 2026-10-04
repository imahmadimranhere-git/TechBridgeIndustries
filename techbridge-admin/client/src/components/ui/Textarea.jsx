import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';
import Field, { fieldMessageId } from './Field.jsx';

const Textarea = forwardRef(function Textarea(
  { label, error, hint, id, required, rows = 4, className, textareaClassName, ...props },
  ref
) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <Field id={textareaId} label={label} required={required} error={error} hint={hint} className={className}>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? fieldMessageId(textareaId) : undefined}
        className={cn('input-base resize-y', error && 'border-danger focus:border-danger focus:ring-danger/30', textareaClassName)}
        {...props}
      />
    </Field>
  );
});

export default Textarea;