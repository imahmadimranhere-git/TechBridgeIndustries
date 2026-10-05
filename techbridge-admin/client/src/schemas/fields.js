import { z } from 'zod';
import { safeMinor, toMinor } from '../utils/formatMoney.js';

export const text = (max, label) => z.string().trim().max(max, `${label} cannot be longer than ${max} characters`);

export const requiredText = (max, label) => text(max, label).min(1, `${label} is required`);

/** Money typed in rupees ("125,000.50"); sent to the server as text, which converts it to paisa */
export const moneyString = (label, { min = 0, required = true } = {}) =>
  z
    .string()
    .trim()
    .refine(
      (value) => {
        if (!value) return !required;
        const minor = safeMinor(value);
        return minor !== null && minor >= toMinor(String(min));
      },
      min > 0 ? `${label} must be a valid amount greater than 0` : `${label} must be a valid amount`
    );

const twoDecimals = (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const percentString = (label) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (value === '') return true;
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 && number <= 100 && twoDecimals(number);
    }, `${label} must be between 0 and 100 (max 2 decimals)`);