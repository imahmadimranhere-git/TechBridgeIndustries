import { z } from 'zod';
import { COMMISSION_TYPE, COMMISSION_TYPES, PAYMENT_METHODS, STAFF_STATUSES } from '../config/constants.js';
import {
  dateInput,
  dateRangeQuery,
  moneyInput,
  optionalDateInput,
  optionalEmail,
  optionalEnum,
  optionalId,
  optionalText,
  paginationQuery,
  parseCommission,
  requiredText,
} from './common.js';

const CNIC_REGEX = /^\d{5}-\d{7}-\d$/;

export const staffBodySchema = z
  .object({
    name: requiredText(120, 'Name'),
    email: optionalEmail,
    phone: optionalText(30, 'Phone'),
    cnic: optionalText(15, 'CNIC').refine(
      (value) => !value || CNIC_REGEX.test(value),
      'CNIC must look like 12345-1234567-1'
    ),
    address: optionalText(300, 'Address'),
    joiningDate: optionalDateInput('Joining date'),
    commissionType: z.enum(COMMISSION_TYPES).default(COMMISSION_TYPE.PERCENTAGE),
    commissionRate: z.union([z.string(), z.number()]).default(0),
    status: z.enum(STAFF_STATUSES).default('Active'),
  })
  .transform(parseCommission);

export const staffListQuery = paginationQuery.extend({
  status: optionalEnum(STAFF_STATUSES),
});

export const staffProfileQuery = dateRangeQuery;

export const payoutBodySchema = z.object({
  amount: moneyInput({ label: 'Amount', min: 0.01 }),
  date: dateInput('Payout date'),
  method: z.enum(PAYMENT_METHODS).default('Cash'),
  reference: optionalText(120, 'Reference'),
  note: optionalText(1000, 'Note'),
  confirmOverpay: z.boolean().default(false),
});

export const payoutListQuery = paginationQuery.extend(dateRangeQuery.shape).extend({
  staffId: optionalId('Staff'),
});