import { format, startOfMonth } from 'date-fns';

// Same values the server understands (server/src/utils/dateRanges.js)
export const DATE_RANGE_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

export const DEFAULT_RANGE = { range: 'this_month' };

export function defaultCustomRange() {
  const today = new Date();
  return { range: 'custom', from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
}

/** Query params for the API: { range } or { range: 'custom', from, to } */
export function rangeParams(value) {
  if (value?.range === 'custom') return { range: 'custom', from: value.from, to: value.to };
  return { range: value?.range ?? 'all_time' };
}