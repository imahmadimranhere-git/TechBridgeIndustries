import { z } from 'zod';
import { COMMISSION_TYPES, DEAL_STATUSES } from '../config/constants.js';
import {
  dateInput,
  moneyInput,
  nullableObjectId,
  objectId,
  optionalDateInput,
  optionalEnum,
  optionalId,
  optionalText,
  paginationQuery,
  parseCommission,
  requiredText,
} from './common.js';

export const dealBodySchema = z
  .object({
    client: objectId('Client'),
    title: requiredText(150, 'Deal title'),
    description: optionalText(5000, 'Description'),
    dealAmount: moneyInput({ label: 'Deal amount', min: 0.01 }),
    startDate: dateInput('Start date'),
    deadline: optionalDateInput('Deadline'),
    assignedStaff: nullableObjectId('Staff'),
    status: z.enum(DEAL_STATUSES).default('Pending'),
    notes: optionalText(2000, 'Notes'),
    // Optional override; when missing the staff member's default is copied
    commissionType: z.enum(COMMISSION_TYPES).optional(),
    commissionRate: z.union([z.string(), z.number()]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deadline && data.startDate && data.deadline < data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline cannot be before the start date' });
    }
  })
  .transform(parseCommission);

export const dealListQuery = paginationQuery.extend({
  status: optionalEnum(DEAL_STATUSES),
  clientId: optionalId('Client'),
  staffId: optionalId('Staff'),
});