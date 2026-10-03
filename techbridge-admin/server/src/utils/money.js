const MINOR_PER_MAJOR = 100;
const AMOUNT_PATTERN = /^(-)?(\d+)(?:\.(\d+))?$/;

/**
 * Display value -> integer minor units (paisa).
 * Accepts numbers or strings like "125,000.50". Rounds half-up to the nearest paisa.
 * Parsing is done on the text so 1.005 never turns into 100.4999 paisa.
 */
export function toMinor(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`Invalid amount: ${value}`);
  }

  const text = String(value).trim().replace(/,/g, '');
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) throw new TypeError(`Invalid amount: "${value}"`);

  const [, sign, whole, fraction = ''] = match;
  const digits = `${fraction}000`.slice(0, 3); // two decimals + one digit for rounding
  let minor = Number(whole) * MINOR_PER_MAJOR + Number(digits.slice(0, 2));
  if (Number(digits[2]) >= 5) minor += 1;

  if (!Number.isSafeInteger(minor)) throw new RangeError('Amount is too large');
  return sign && minor !== 0 ? -minor : minor;
}

/** Integer minor units -> plain number for form inputs (12500050 -> 125000.5) */
export function toMajor(minor) {
  if (minor === null || minor === undefined) return 0;
  if (!Number.isInteger(minor)) throw new TypeError(`Minor amount must be an integer, got ${minor}`);
  return minor / MINOR_PER_MAJOR;
}

/**
 * Integer minor units -> "Rs 125,000" / "Rs 125,000.50" / "-Rs 5,000".
 * decimals: 'auto' (only when there are paisa), 'always' or 'never'.
 */
export function formatMoney(minor, { symbol = 'Rs', decimals = 'auto' } = {}) {
  const amount = Math.round(Number(minor) || 0);
  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute / MINOR_PER_MAJOR);
  const paisa = absolute % MINOR_PER_MAJOR;

  let number = whole.toLocaleString('en-US');
  const showDecimals = decimals === 'always' || (decimals === 'auto' && paisa !== 0);
  if (showDecimals) number += `.${String(paisa).padStart(2, '0')}`;

  // Word-like symbols get a space ("Rs 500"), sign-like symbols don't ("$500")
  const cleanSymbol = (symbol ?? '').trim();
  const separator = /[A-Za-z.]$/.test(cleanSymbol) ? ' ' : '';
  const prefix = cleanSymbol ? `${cleanSymbol}${separator}` : '';

  return `${amount < 0 ? '-' : ''}${prefix}${number}`;
}

/** part / whole as a percentage with 2 decimals (safe when whole is 0) */
export function percentOf(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

export function formatPercent(value) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return `${rounded.toLocaleString('en-US')}%`;
}

export const sumMinor = (amounts = []) => amounts.reduce((total, value) => total + (value || 0), 0);

export default { toMinor, toMajor, formatMoney, percentOf, formatPercent, sumMinor };