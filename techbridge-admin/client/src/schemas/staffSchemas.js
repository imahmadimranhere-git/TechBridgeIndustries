import { z } from 'zod';
import { COMMISSION_TYPES, PAYMENT_METHODS, STAFF_STATUSES } from '../utils/constants.js';
import { safeMinor, toMajor } from '../utils/formatMoney.js';
import { toDateInput } from '../utils/formatDate.js';
import { moneyString, requiredText, text } from './fields.js';

const CNIC = /^\d{5}-\d{7}-\d$/;

// Mirrors server/src/validators/staffValidators.js
export const staffSchema = z
  .object({
    name: requiredText(120, 'Name'),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Email is invalid')]),
    phone: text(30, 'Phone'),
    cnic: text(15, 'CNIC').refine((value) => !value || CNIC.test(value), 'CNIC must look like 12345-1234567-1'),
    address: text(300, 'Address'),
    joiningDate: z.string(),
    commissionType: z.enum(COMMISSION_TYPES),
    commissionRate: z.string().trim(),
    status: z.enum(STAFF_STATUSES),
  })
  .superRefine((data, ctx) => {
    const rate = data.commissionRate;
    const valid =
      data.commissionType === 'fixed'
        ? rate !== '' && (safeMinor(rate) ?? -1) >= 0
        : rate !== '' && Number.isFinite(Number(rate)) && Number(rate) >= 0 && Number(rate) <= 100;
    if (!valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['commissionRate'],
        message: data.commissionType === 'fixed' ? 'Enter a valid amount (0 or more)' : 'Enter a percentage between 0 and 100',
      });
    }
  });

export const emptyStaff = {
  name: '',
  email: '',
  phone: '',
  cnic: '',
  address: '',
  joiningDate: toDateInput(new Date()),
  commissionType: 'percentage',
  commissionRate: '',
  status: 'Active',
};

/** Staff from the API -> form values (fixed commission back to rupees) */
export function staffToForm(staff) {
  return {
    name: staff.name,
    email: staff.email ?? '',
    phone: staff.phone ?? '',
    cnic: staff.cnic ?? '',
    address: staff.address ?? '',
    joiningDate: toDateInput(staff.joiningDate),
    commissionType: staff.commissionType,
    commissionRate: staff.commissionType === 'fixed' ? String(toMajor(staff.commissionRate)) : String(staff.commissionRate ?? ''),
    status: staff.status,
  };
}

// Mirrors the server's payoutBodySchema
export const payoutSchema = z.object({
  staff: z.string().min(1, 'Choose a staff member'),
  amount: moneyString('Amount', { min: 0.01 }),
  date: z.string().min(1, 'Payout date is required'),
  method: z.enum(PAYMENT_METHODS),
  reference: text(120, 'Reference'),
  note: text(1000, 'Note'),
});

export const emptyPayout = (staff = '') => ({
  staff,
  amount: '',
  date: toDateInput(new Date()),
  method: 'Bank',
  reference: '',
  note: '',
});