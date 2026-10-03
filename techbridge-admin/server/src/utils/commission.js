import { COMMISSION_TYPE } from '../config/constants.js';

/**
 * Total commission for a deal, in paisa.
 * percentage: dealAmount x rate / 100 (rounded to the nearest paisa)
 * fixed:      the fixed amount itself
 */
export function computeCommissionTotal({ dealAmount = 0, commissionType, commissionRate = 0 }) {
  if (!dealAmount || !commissionRate) return 0;
  if (commissionType === COMMISSION_TYPE.FIXED) return Math.round(commissionRate);
  return Math.round((dealAmount * commissionRate) / 100);
}