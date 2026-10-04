// Same rules as server/src/utils/money.js so the screen and the PDFs always match
const MINOR_PER_MAJOR = 100;
const AMOUNT_PATTERN = /^(-)?(\d+)(?:\.(\d+))?$/;

/** "125,000.50" -> 12500050 (integer paisa) */
export function toMinor(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError(`Invalid amount: ${value}`);

  const text = String(value).trim().replace(/,/g, '');
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) throw new TypeError(`Invalid amount: "${value}"`);

  const [, sign, whole, fraction = ''] = match;
  const digits = `${fraction}000`.slice(0, 3);
  let minor = Number(whole) * MINOR_PER_MAJOR + Number(digits.slice(0, 2));
  if (Number(digits[2]) >= 5) minor += 1;

  if (!Number.isSafeInteger(minor)) throw new RangeError('Amount is too large');
  return sign && minor !== 0 ? -minor : minor;
}

/** 12500050 -> 125000.5 (for form inputs) */
export function toMajor(minor) {
  if (minor === null || minor === undefined) return 0;
  return Number(minor) / MINOR_PER_MAJOR;
}

/** 12500050 -> "Rs 125,000.50"; decimals: 'auto' | 'always' | 'never' */
export function formatMoney(minor, { symbol = 'Rs', decimals = 'auto' } = {}) {
  const amount = Math.round(Number(minor) || 0);
  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute / MINOR_PER_MAJOR);
  const paisa = absolute % MINOR_PER_MAJOR;

  let number = whole.toLocaleString('en-US');
  const showDecimals = decimals === 'always' || (decimals === 'auto' && paisa !== 0);
  if (showDecimals) number += `.${String(paisa).padStart(2, '0')}`;

  const cleanSymbol = (symbol ?? '').trim();
  const separator = /[A-Za-z.]$/.test(cleanSymbol) ? ' ' : '';
  const prefix = cleanSymbol ? `${cleanSymbol}${separator}` : '';

  return `${amount < 0 ? '-' : ''}${prefix}${number}`;
}

export function percentOf(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

export function formatPercent(value) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return `${rounded.toLocaleString('en-US')}%`;
}