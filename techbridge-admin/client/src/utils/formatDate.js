import { format, isValid } from 'date-fns';

/** "2026-10-04T..." -> "04 Oct 2026" (empty string for missing or invalid dates) */
export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) return '';
  const date = new Date(value);
  return isValid(date) ? format(date, pattern) : '';
}

/** Value for <input type="date">: "2026-10-04" */
export function toDateInput(value) {
  return formatDate(value, 'yyyy-MM-dd');
}