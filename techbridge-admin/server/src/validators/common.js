import mongoose from 'mongoose';
import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';
import { DATE_RANGES } from '../utils/dateRanges.js';
import { toMinor } from '../utils/money.js';
import { COMMISSION_TYPE } from '../config/constants.js';

/* Reusable Zod building blocks shared by every module's validators */

const blankToUndefined = (value) => (value === '' || value === null ? undefined : value);

export const objectId = (label = 'Id') =>
  z
    .string()
    .trim()
    .refine((value) => /^[a-f\d]{24}$/i.test(value) && mongoose.isValidObjectId(value), `${label} is not valid`);

// '' / null / missing -> null (e.g. a payment without an invoice)
export const nullableObjectId = (label = 'Id') =>
  z.preprocess((value) => (value === '' || value === undefined ? null : value), objectId(label).nullable());

export const idParams = z.object({ id: objectId() });

export const requiredText = (max, label) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} cannot be longer than ${max} characters`);

export const optionalText = (max, label) =>
  z.preprocess(
    (value) => value ?? '',
    z.string().trim().max(max, `${label} cannot be longer than ${max} characters`)
  );

export const emailField = z.string().trim().toLowerCase().email('Email is invalid').max(150);

export const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value ?? ''),
  z.union([z.literal(''), emailField])
);

/** Money typed in rupees ("125,000.50" or 125000.5) -> integer paisa */
export const moneyInput = ({ label = 'Amount', min = 0 } = {}) =>
  z
    .union([z.string(), z.number()], { message: `${label} is required` })
    .transform((value, ctx) => {
      try {
        return toMinor(value);
      } catch {
        ctx.addIssue({ code: 'custom', message: `${label} must be a valid amount` });
        return z.NEVER;
      }
    })
    .refine((value) => value >= toMinor(min), `${label} must be at least ${min}`);

/** "2026-01-15" (local date) or ISO string -> Date */
export const dateInput = (label = 'Date') =>
  z.union([z.string(), z.date()], { message: `${label} is required` }).transform((value, ctx) => {
    const date = value instanceof Date ? value : parseISO(value);
    if (!isValid(date)) {
      ctx.addIssue({ code: 'custom', message: `${label} is not a valid date` });
      return z.NEVER;
    }
    return date;
  });

export const optionalDateInput = (label = 'Date') =>
  z.preprocess(blankToUndefined, dateInput(label).optional()).transform((value) => value ?? null);

export const percentInput = (label = 'Percentage') =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(100, `${label} cannot be more than 100`)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, `${label} can have at most 2 decimals`);

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(''),
});

export const dateRangeQuery = z.object({
  range: z.enum(DATE_RANGES).default('all_time'),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});


/* ---------- Query helpers: empty strings from the browser mean "no filter" ---------- */

export const optionalEnum = (values) => z.preprocess(blankToUndefined, z.enum(values).optional());

export const optionalId = (label = 'Id') => z.preprocess(blankToUndefined, objectId(label).optional());

/**
 * Staff and deal commission.
 * percentage: stays a number (12.5 means 12.5%)
 * fixed:      typed in rupees, stored in paisa
 * When commissionType is missing (deal without an override) the data is returned untouched.
 */
export function parseCommission(data, ctx) {
  if (data.commissionType === undefined) return data;
  const raw = data.commissionRate ?? 0;

  if (data.commissionType === COMMISSION_TYPE.FIXED) {
    try {
      const minor = toMinor(raw);
      if (minor < 0) throw new Error('negative');
      return { ...data, commissionRate: minor };
    } catch {
      ctx.addIssue({ code: 'custom', path: ['commissionRate'], message: 'Fixed commission must be a valid amount' });
      return z.NEVER;
    }
  }

  const percent = Number(raw);
  const twoDecimals = Math.abs(percent * 100 - Math.round(percent * 100)) < 1e-6;
  if (!Number.isFinite(percent) || percent < 0 || percent > 100 || !twoDecimals) {
    ctx.addIssue({
      code: 'custom',
      path: ['commissionRate'],
      message: 'Percentage must be between 0 and 100 (max 2 decimals)',
    });
    return z.NEVER;
  }
  return { ...data, commissionRate: percent };
}