import { z } from 'zod';
import { PAYMENT_METHODS } from '../utils/constants.js';
import { toDateInput } from '../utils/formatDate.js';
import { moneyString, text } from './fields.js';

// Mirrors server/src/validators/paymentValidators.js (client is taken from the deal on the server)
export const paymentSchema = z.object({
  deal: z.string().min(1, 'Choose a deal'),
  invoice: z.string(),
  amount: moneyString('Amount', { min: 0.01 }),
  date: z.string().min(1, 'Payment date is required'),
  method: z.enum(PAYMENT_METHODS),
  reference: text(120, 'Reference'),
  note: text(1000, 'Note'),
});

export const emptyPayment = (deal = '', invoice = '') => ({
  deal,
  invoice,
  amount: '',
  date: toDateInput(new Date()),
  method: 'Bank',
  reference: '',
  note: '',
});

export const paymentToPayload = (values, confirmOverpay = false) => ({
  deal: values.deal,
  invoice: values.invoice || null,
  amount: values.amount,
  date: values.date,
  method: values.method,
  reference: values.reference,
  note: values.note,
  confirmOverpay,
});