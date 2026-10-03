import mongoose from 'mongoose';
import { DEAL_STATUS } from '../config/constants.js';
import { Deal, Invoice, Payment } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { dateMatch, resolveDateRange } from '../utils/dateRanges.js';
import { formatMoney } from '../utils/money.js';
import { paginate } from '../utils/pagination.js';
import { searchFilter } from '../utils/search.js';
import FinanceService from './FinanceService.js';
import { getSettings } from './SettingsService.js';

const { ObjectId } = mongoose.Types;

const PAYMENT_POPULATE = [
  { path: 'client', select: 'name companyName' },
  { path: 'deal', select: 'title' },
  { path: 'invoice', select: 'invoiceNumber' },
  { path: 'signedBy', select: 'name designation' },
];

/**
 * Sets an invoice's amountPaid from the SUM of its payments, then its status.
 * Recomputing from the source (instead of adding/subtracting) can never drift.
 */
export async function recalculateInvoice(invoiceId, session) {
  const invoice = await Invoice.findById(invoiceId).session(session);
  if (!invoice) return null;

  const [row] = await Payment.aggregate([
    { $match: { invoice: invoice._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]).session(session);

  invoice.amountPaid = row?.total ?? 0;
  invoice.status = invoice.deriveStatus();
  await invoice.save({ session });
  return invoice;
}

function buildFilter({ clientId, dealId, method, range, from, to, search }) {
  const period = resolveDateRange({ range, from, to });
  // ObjectIds are cast by hand because the same filter is also used in an aggregation
  const filter = { ...dateMatch('date', period), ...searchFilter(search, ['reference', 'note']) };
  if (clientId) filter.client = new ObjectId(clientId);
  if (dealId) filter.deal = new ObjectId(dealId);
  if (method) filter.method = method;
  return { filter, period };
}

export async function listPayments(query) {
  const { filter, period } = buildFilter(query);
  const [result, [totals]] = await Promise.all([
    paginate(Payment, filter, {
      page: query.page,
      limit: query.limit,
      sort: { date: -1, _id: -1 },
      populate: PAYMENT_POPULATE,
    }),
    Payment.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
  ]);

  return {
    ...result,
    totals: { amount: totals?.amount ?? 0 },
    period: { range: period.range, label: period.label, from: period.from, to: period.to },
  };
}

export async function getPaymentDetail(id) {
  const payment = await Payment.findById(id).populate(PAYMENT_POPULATE).lean();
  if (!payment) throw ApiError.notFound('Payment not found');
  return payment;
}

export async function createPayment(data, user) {
  const deal = await Deal.findById(data.deal);
  if (!deal) throw ApiError.badRequest('Selected deal was not found', { deal: 'Deal not found' });
  if (deal.status === DEAL_STATUS.CANCELLED) {
    throw ApiError.badRequest('Payments cannot be added to a cancelled deal', { deal: 'This deal is cancelled' });
  }

  let invoice = null;
  if (data.invoice) {
    invoice = await Invoice.findById(data.invoice);
    if (!invoice) throw ApiError.badRequest('Selected invoice was not found', { invoice: 'Invoice not found' });
    if (String(invoice.deal) !== String(deal._id)) {
      throw ApiError.badRequest('This invoice belongs to a different deal', {
        invoice: 'Invoice is not for this deal',
      });
    }
  }

  // Ask the admin to confirm before recording more than is owed
  if (!data.confirmOverpay) {
    const { remaining } = await FinanceService.getDealFinancial(deal._id);
    const { currencySymbol } = await getSettings();
    const format = (value) => formatMoney(value, { symbol: currencySymbol });

    const reasons = [];
    if (data.amount > remaining) reasons.push(`more than the deal's remaining amount (${format(remaining)})`);
    if (invoice && data.amount > invoice.balanceDue) {
      reasons.push(`more than the invoice balance (${format(invoice.balanceDue)})`);
    }
    if (reasons.length) {
      throw ApiError.needsConfirmation(
        `This payment of ${format(data.amount)} is ${reasons.join(' and ')}. Save it anyway?`,
        { dealRemaining: remaining, invoiceBalance: invoice ? invoice.balanceDue : null }
      );
    }
  }

  let payment;
  // Payment + invoice status succeed or fail together
  await mongoose.connection.transaction(async (session) => {
    [payment] = await Payment.create(
      [
        {
          client: deal.client,
          deal: deal._id,
          invoice: invoice?._id ?? null,
          amount: data.amount,
          date: data.date,
          method: data.method,
          reference: data.reference,
          note: data.note,
          signedBy: user._id,
          createdBy: user._id,
        },
      ],
      { session }
    );
    if (invoice) await recalculateInvoice(invoice._id, session);
  });

  return getPaymentDetail(payment._id);
}

export async function deletePayment(id) {
  const payment = await Payment.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');

  await mongoose.connection.transaction(async (session) => {
    await payment.deleteOne({ session });
    if (payment.invoice) await recalculateInvoice(payment.invoice, session);
  });
}