import { formatMoney, formatPercent, percentOf, toMajor, toMinor } from '../../src/utils/money.js';

describe('toMinor', () => {
  test.each([
    [125000, 12500000],
    ['125,000', 12500000],
    ['125000.5', 12500050],
    ['125,000.50', 12500050],
    [0.1, 10],
    ['0.29', 29],
    [1.005, 101],
    ['-50', -5000],
    ['', 0],
    [null, 0],
  ])('toMinor(%p) -> %p', (input, expected) => {
    expect(toMinor(input)).toBe(expected);
  });

  test('rejects text that is not a number', () => {
    expect(() => toMinor('abc')).toThrow('Invalid amount');
    expect(() => toMinor('12.5.3')).toThrow('Invalid amount');
  });
});

describe('toMajor', () => {
  test('converts paisa back to rupees', () => {
    expect(toMajor(12500050)).toBe(125000.5);
    expect(toMajor(0)).toBe(0);
  });

  test('rejects non-integer minor amounts', () => {
    expect(() => toMajor(10.5)).toThrow();
  });
});

describe('formatMoney', () => {
  test('adds the symbol and thousand separators', () => {
    expect(formatMoney(12500000)).toBe('Rs 125,000');
  });

  test('shows paisa only when present (auto)', () => {
    expect(formatMoney(12500050)).toBe('Rs 125,000.50');
  });

  test('can always show decimals', () => {
    expect(formatMoney(12500000, { decimals: 'always' })).toBe('Rs 125,000.00');
  });

  test('formats negative amounts', () => {
    expect(formatMoney(-500000)).toBe('-Rs 5,000');
  });

  test('symbols like $ have no space', () => {
    expect(formatMoney(150000, { symbol: '$' })).toBe('$1,500');
  });
});

describe('percentages', () => {
  test('percentOf handles normal values and zero', () => {
    expect(percentOf(5000, 20000)).toBe(25);
    expect(percentOf(1, 3)).toBe(33.33);
    expect(percentOf(100, 0)).toBe(0);
  });

  test('formatPercent', () => {
    expect(formatPercent(12.5)).toBe('12.5%');
  });
});