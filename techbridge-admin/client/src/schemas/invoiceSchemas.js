import { addDays } from 'date-fns';
import { z } from 'zod';
import { toMajor } from '../utils/formatMoney.js';
import { toDateInput } from '../utils/formatDate.js';
import { moneyString, percentString, requiredText, text } from './fields.js';

const quantity = z
  .string()
  .trim()
  .refine((value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 && Math.abs(number * 100 - Math.round(number * 100)) < 1e-6;
  }, 'Qty must be more than 0');

const itemSchema = z.object({
  description: requiredText(500, 'Description'),
  qty: quantity,
  rate: moneyString('Rate'),
});

// Mirrors server/src/validators/invoiceValidators.js (no totals: the server calculates them)
export const invoiceSchema = z
  .object({
    deal: z.string().min(1, 'Choose a deal'),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    items: z.array(itemSchema).min(1, 'Add at least one line item').max(100, 'At most 100 items'),
    discount: moneyString('Discount', { required: false }),
    taxPercent: percentString('Tax'),
    notes: text(2000, 'Notes'),
    terms: text(3000, 'Terms'),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate < data.invoiceDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Due date cannot be before the invoice date' });
    }
  });

export const emptyItem = () => ({ description: '', qty: '1', rate: '' });

export function emptyInvoice({ deal = '', dueDays = 15, taxPercent = 0, terms = '' } = {}) {
  const today = new Date();
  return {
    deal,
    invoiceDate: toDateInput(today),
    dueDate: toDateInput(addDays(today, Number(dueDays) || 0)),
    items: [emptyItem()],
    discount: '',
    taxPercent: String(taxPercent ?? 0),
    notes: '',
    terms: terms ?? '',
  };
}

export function invoiceToForm(invoice) {
  return {
    deal: invoice.deal?._id ?? invoice.deal,
    invoiceDate: toDateInput(invoice.invoiceDate),
    dueDate: toDateInput(invoice.dueDate),
    items: invoice.items.map((item) => ({
      description: item.description,
      qty: String(item.qty),
      rate: String(toMajor(item.rate)),
    })),
    discount: invoice.discount ? String(toMajor(invoice.discount)) : '',
    taxPercent: String(invoice.taxPercent ?? 0),
    notes: invoice.notes ?? '',
    terms: invoice.terms ?? '',
  };
}

export const invoiceToPayload = (values, status) => ({
  deal: values.deal,
  invoiceDate: values.invoiceDate,
  dueDate: values.dueDate,
  items: values.items.map(({ description, qty, rate }) => ({ description, qty: Number(qty), rate })),
  discount: values.discount || '0',
  taxPercent: values.taxPercent === '' ? 0 : Number(values.taxPercent),
  notes: values.notes,
  terms: values.terms,
  status,
});