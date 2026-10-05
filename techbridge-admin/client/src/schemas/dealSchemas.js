import { z } from 'zod';
import { COMMISSION_TYPES, DEAL_STATUSES } from '../utils/constants.js';
import { safeMinor, toMajor } from '../utils/formatMoney.js';
import { toDateInput } from '../utils/formatDate.js';
import { moneyString, requiredText, text } from './fields.js';

// Mirrors server/src/validators/dealValidators.js
export const dealSchema = z
  .object({
    client: z.string().min(1, 'Choose a client'),
    title: requiredText(150, 'Deal title'),
    description: text(5000, 'Description'),
    dealAmount: moneyString('Deal amount', { min: 0.01 }),
    startDate: z.string().min(1, 'Start date is required'),
    deadline: z.string(),
    assignedStaff: z.string(),
    status: z.enum(DEAL_STATUSES),
    notes: text(2000, 'Notes'),
    overrideCommission: z.boolean(),
    commissionType: z.enum(COMMISSION_TYPES),
    commissionRate: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (data.deadline && data.deadline < data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline cannot be before the start date' });
    }
    if (data.overrideCommission && data.assignedStaff) {
      const valid =
        data.commissionType === 'fixed'
          ? (safeMinor(data.commissionRate) ?? -1) >= 0
          : Number(data.commissionRate) >= 0 && Number(data.commissionRate) <= 100;
      if (!data.commissionRate || !valid) {
        ctx.addIssue({
          code: 'custom',
          path: ['commissionRate'],
          message: data.commissionType === 'fixed' ? 'Enter a valid amount' : 'Enter a percentage between 0 and 100',
        });
      }
    }
  });

export const emptyDeal = (clientId = '') => ({
  client: clientId,
  title: '',
  description: '',
  dealAmount: '',
  startDate: toDateInput(new Date()),
  deadline: '',
  assignedStaff: '',
  status: 'Pending',
  notes: '',
  overrideCommission: false,
  commissionType: 'percentage',
  commissionRate: '',
});

/** Deal from the API -> form values (money back to rupees) */
export function dealToForm(deal) {
  return {
    client: deal.client?._id ?? deal.client,
    title: deal.title,
    description: deal.description ?? '',
    dealAmount: String(toMajor(deal.dealAmount)),
    startDate: toDateInput(deal.startDate),
    deadline: toDateInput(deal.deadline),
    assignedStaff: deal.assignedStaff?._id ?? deal.assignedStaff ?? '',
    status: deal.status,
    notes: deal.notes ?? '',
    overrideCommission: false,
    commissionType: deal.commissionType,
    commissionRate: deal.commissionType === 'fixed' ? String(toMajor(deal.commissionRate)) : String(deal.commissionRate ?? ''),
  };
}

/** Form values -> request body. Commission is only sent when the admin overrides it. */
export function dealToPayload(values) {
  const { overrideCommission, commissionType, commissionRate, ...rest } = values;
  return {
    ...rest,
    ...(overrideCommission && values.assignedStaff ? { commissionType, commissionRate } : {}),
  };
}