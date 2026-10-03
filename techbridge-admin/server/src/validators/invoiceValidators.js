import { z } from 'zod';
import { INVOICE_STATUS, INVOICE_STATUSES } from '../config/constants.js';
import {
  dateInput,
  dateRangeQuery,
  moneyInput,
  objectId,
  optionalEnum,
  optionalId,
  optionalText,
  paginationQuery,
  percentInput,
  requiredText,
} from './common.js';

const twoDecimals = (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

// Only description, qty and rate are accepted; "amount" is always calculated on the server
const itemSchema = z.object({
  description: requiredText(500, 'Description'),
  qty: z.coerce
    .number({ message: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0')
    .max(100000, 'Quantity is too large')
    .refine(twoDecimals, 'Quantity can have at most 2 decimals'),
  rate: moneyInput({ label: 'Rate', min: 0 }),
});

export const invoiceBodySchema = z
  .object({
    deal: objectId('Deal'),
    invoiceDate: dateInput('Invoice date'),
    dueDate: dateInput('Due date'),
    items: z
      .array(itemSchema, { message: 'Add at least one line item' })
      .min(1, 'Add at least one line item')
      .max(100, 'An invoice can have at most 100 items'),
    discount: moneyInput({ label: 'Discount', min: 0 }).optional(),
    taxPercent: percentInput('Tax').optional(),
    notes: optionalText(2000, 'Notes'),
    terms: optionalText(3000, 'Terms'),
    // Paid / Partially Paid / Overdue are calculated, never chosen
    status: z.enum([INVOICE_STATUS.DRAFT, INVOICE_STATUS.SENT]).default(INVOICE_STATUS.DRAFT),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate < data.invoiceDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Due date cannot be before the invoice date' });
    }
  });

export const invoiceListQuery = paginationQuery.extend(dateRangeQuery.shape).extend({
  status: optionalEnum(INVOICE_STATUSES),
  clientId: optionalId('Client'),
  dealId: optionalId('Deal'),
});