/**
 * Shows server validation errors ({ errors: { email: '...' } }) under the matching form fields.
 * Returns true when at least one field error was applied.
 */
export function applyServerErrors(error, setError) {
  const entries = Object.entries(error?.errors ?? {});
  entries.forEach(([name, message], index) => {
    setError(name, { type: 'server', message }, { shouldFocus: index === 0 });
  });
  return entries.length > 0;
}