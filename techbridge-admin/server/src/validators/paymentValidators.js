import { z } from 'zod';
import { PAYMENT_METHODS } from '../config/constants.js';
import {
  dateInput,
  dateRangeQuery,
  moneyInput,
  nullableObjectId,
  objectId,
  optionalEnum,
  optionalId,
  optionalText,
  paginationQuery,
} from './common.js';

export const paymentBodySchema = z.object({
  deal: objectId('Deal'),
  invoice: nullableObjectId('Invoice'),
  amount: moneyInput({ label: 'Amount', min: 0.01 }),
  date: dateInput('Payment date'),
  method: z.enum(PAYMENT_METHODS).default('Cash'),
  reference: optionalText(120, 'Reference'),
  note: optionalText(1000, 'Note'),
  confirmOverpay: z.boolean().default(false),
});

export const paymentListQuery = paginationQuery.extend(dateRangeQuery.shape).extend({
  clientId: optionalId('Client'),
  dealId: optionalId('Deal'),
  method: optionalEnum(PAYMENT_METHODS),
});