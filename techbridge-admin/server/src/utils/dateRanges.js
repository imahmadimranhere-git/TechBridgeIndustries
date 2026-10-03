import {
  addMonths,
  differenceInCalendarMonths,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns';
import ApiError from './ApiError.js';

export const DATE_RANGE = Object.freeze({
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_YEAR: 'this_year',
  ALL_TIME: 'all_time',
  CUSTOM: 'custom',
});
export const DATE_RANGES = Object.values(DATE_RANGE);

function parseDay(value, fieldName) {
  const date = value instanceof Date ? value : typeof value === 'string' ? parseISO(value) : null;
  if (!date || !isValid(date)) {
    throw ApiError.badRequest(`"${fieldName}" must be a valid date (YYYY-MM-DD)`);
  }
  return date;
}

/**
 * Turns a dashboard filter into real dates (in APP_TIMEZONE, set in env.js).
 * Returns { range, from, to, label }. from/to are null for "all_time".
 */
export function resolveDateRange({ range = DATE_RANGE.ALL_TIME, from, to } = {}, now = new Date()) {
  switch (range) {
    case DATE_RANGE.THIS_MONTH:
      return { range, from: startOfMonth(now), to: endOfMonth(now), label: format(now, 'MMMM yyyy') };

    case DATE_RANGE.LAST_MONTH: {
      const lastMonth = subMonths(now, 1);
      return {
        range,
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: format(lastMonth, 'MMMM yyyy'),
      };
    }

    case DATE_RANGE.THIS_YEAR:
      return { range, from: startOfYear(now), to: endOfYear(now), label: format(now, 'yyyy') };

    case DATE_RANGE.ALL_TIME:
      return { range, from: null, to: null, label: 'All Time' };

    case DATE_RANGE.CUSTOM: {
      if (!from || !to) throw ApiError.badRequest('Custom range needs both "from" and "to" dates');
      const start = startOfDay(parseDay(from, 'from'));
      const end = endOfDay(parseDay(to, 'to'));
      if (start > end) throw ApiError.badRequest('"from" date must be on or before "to" date');
      return {
        range,
        from: start,
        to: end,
        label: `${format(start, 'dd MMM yyyy')} – ${format(end, 'dd MMM yyyy')}`,
      };
    }

    default:
      throw ApiError.badRequest(`Unknown date range "${range}". Use one of: ${DATE_RANGES.join(', ')}`);
  }
}

/** { date: { $gte, $lte } } for MongoDB, or {} when there is no limit */
export function dateMatch(field, { from, to } = {}) {
  if (!from && !to) return {};
  const condition = {};
  if (from) condition.$gte = from;
  if (to) condition.$lte = to;
  return { [field]: condition };
}

/**
 * Month buckets for the dashboard bar chart.
 * All time (no from) -> last 12 months. Never more than maxMonths bars.
 */
export function monthBuckets({ from, to } = {}, now = new Date(), maxMonths = 24) {
  const end = startOfMonth(to ?? now);
  let start = startOfMonth(from ?? subMonths(end, 11));
  if (differenceInCalendarMonths(end, start) + 1 > maxMonths) {
    start = subMonths(end, maxMonths - 1);
  }

  const buckets = [];
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    buckets.push({
      key: format(cursor, 'yyyy-MM'),
      label: format(cursor, 'MMM yyyy'),
      from: cursor,
      to: endOfMonth(cursor),
    });
  }
  return buckets;
}