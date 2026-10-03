import { dateMatch, monthBuckets, resolveDateRange } from '../../src/utils/dateRanges.js';

// Pretend today is 15 October 2026 (months are 0-based in JavaScript: 9 = October)
const NOW = new Date(2026, 9, 15, 12, 0, 0);

describe('resolveDateRange', () => {
  test('this_month', () => {
    const { from, to, label } = resolveDateRange({ range: 'this_month' }, NOW);
    expect(from).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
    expect(to).toEqual(new Date(2026, 9, 31, 23, 59, 59, 999));
    expect(label).toBe('October 2026');
  });

  test('last_month', () => {
    const { from, to } = resolveDateRange({ range: 'last_month' }, NOW);
    expect(from).toEqual(new Date(2026, 8, 1));
    expect(to).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999));
  });

  test('last_month in January goes back to December of last year', () => {
    const { from } = resolveDateRange({ range: 'last_month' }, new Date(2026, 0, 10));
    expect(from).toEqual(new Date(2025, 11, 1));
  });

  test('this_year', () => {
    const { from, to } = resolveDateRange({ range: 'this_year' }, NOW);
    expect(from).toEqual(new Date(2026, 0, 1));
    expect(to).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });

  test('all_time has no limits', () => {
    expect(resolveDateRange({ range: 'all_time' }, NOW)).toMatchObject({ from: null, to: null });
  });

  test('custom range covers whole days', () => {
    const { from, to } = resolveDateRange({ range: 'custom', from: '2026-01-05', to: '2026-01-10' }, NOW);
    expect(from).toEqual(new Date(2026, 0, 5, 0, 0, 0, 0));
    expect(to).toEqual(new Date(2026, 0, 10, 23, 59, 59, 999));
  });

  test('custom range rejects reversed or missing dates', () => {
    expect(() => resolveDateRange({ range: 'custom', from: '2026-01-10', to: '2026-01-05' })).toThrow();
    expect(() => resolveDateRange({ range: 'custom', from: '2026-01-10' })).toThrow();
    expect(() => resolveDateRange({ range: 'custom', from: 'hello', to: '2026-01-05' })).toThrow();
  });

  test('unknown range is rejected', () => {
    expect(() => resolveDateRange({ range: 'next_week' })).toThrow('Unknown date range');
  });
});

describe('dateMatch', () => {
  test('builds a MongoDB condition', () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 0, 31);
    expect(dateMatch('date', { from, to })).toEqual({ date: { $gte: from, $lte: to } });
  });

  test('returns an empty object for all time', () => {
    expect(dateMatch('date', { from: null, to: null })).toEqual({});
  });
});

describe('monthBuckets', () => {
  test('one bucket per month of the year', () => {
    const range = resolveDateRange({ range: 'this_year' }, NOW);
    const buckets = monthBuckets(range, NOW);
    expect(buckets).toHaveLength(12);
    expect(buckets[0].key).toBe('2026-01');
    expect(buckets[11].label).toBe('Dec 2026');
  });

  test('all time shows the last 12 months', () => {
    const buckets = monthBuckets({ from: null, to: null }, NOW);
    expect(buckets).toHaveLength(12);
    expect(buckets[11].key).toBe('2026-10');
  });
});