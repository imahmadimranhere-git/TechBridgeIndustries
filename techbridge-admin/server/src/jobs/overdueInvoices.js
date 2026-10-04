import { startOfDay } from 'date-fns';
import { INVOICE_STATUS } from '../config/constants.js';
import logger from '../config/logger.js';
import { Invoice } from '../models/index.js';

/**
 * Marks unpaid invoices whose due date has passed as Overdue.
 * Safe to run any number of times: invoices already Overdue, Paid or Draft are never touched.
 */
export async function markOverdueInvoices(now = new Date()) {
  const today = startOfDay(now);

  const result = await Invoice.updateMany(
    {
      status: { $in: [INVOICE_STATUS.SENT, INVOICE_STATUS.PARTIALLY_PAID] },
      dueDate: { $lt: today },
      // Money is still owed (total > amountPaid)
      $expr: { $gt: ['$total', '$amountPaid'] },
    },
    { $set: { status: INVOICE_STATUS.OVERDUE } }
  );

  const updated = result.modifiedCount ?? 0;
  if (updated > 0) logger.info(`Overdue job: ${updated} invoice(s) marked as Overdue`);
  else logger.info('Overdue job: no invoices to update');

  return updated;
}