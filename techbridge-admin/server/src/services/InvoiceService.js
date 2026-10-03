import { addDays } from 'date-fns';
import mongoose from 'mongoose';
import { DEAL_STATUS, INVOICE_STATUS } from '../config/constants.js';
import { Counter, Deal, Invoice, Payment } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { COUNTER, nextInvoiceNumber } from '../utils/counters.js';
import { dateMatch, resolveDateRange } from '../utils/dateRanges.js';
import { paginate } from '../utils/pagination.js';
import { searchFilter } from '../utils/search.js';
import { withInvoiceBalance } from '../utils/serializers.js';
import FinanceService from './FinanceService.js';
import { getSettings } from './SettingsService.js';

const { ObjectId } = mongoose.Types;

const LIST_POPULATE = [
  { path: 'client', select: 'name companyName' },
  { path: 'deal', select: 'title' },
];

const DETAIL_POPULATE = [
  { path: 'client', select: 'name companyName email phone whatsapp address city country' },
  { path: 'deal', select: 'title dealAmount status' },
  { path: 'signedBy', select: 'name designation' },
  { path: 'createdBy', select: 'name' },
];

export async function findInvoiceOrThrow(id) {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

async function findOpenDeal(dealId) {
  const deal = await Deal.findById(dealId);
  if (!deal) throw ApiError.badRequest('Selected deal was not found', { deal: 'Deal not found' });
  if (deal.status === DEAL_STATUS.CANCELLED) {
    throw ApiError.badRequest('Invoices cannot be created for a cancelled deal', { deal: 'This deal is cancelled' });
  }
  return deal;
}

function buildFilter({ range, from, to, status, clientId, dealId, search }) {
  const period = resolveDateRange({ range, from, to });
  const filter = { ...dateMatch('invoiceDate', period), ...searchFilter(search, ['invoiceNumber', 'notes']) };
  if (status) filter.status = status;
  if (clientId) filter.client = new ObjectId(clientId);
  if (dealId) filter.deal = new ObjectId(dealId);
  return { filter, period };
}

export async function listInvoices(query) {
  const { filter, period } = buildFilter(query);
  const [result, [totals]] = await Promise.all([
    paginate(Invoice, filter, {
      page: query.page,
      limit: query.limit,
      sort: { invoiceDate: -1, sequence: -1 },
      populate: LIST_POPULATE,
    }),
    Invoice.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$total' }, amountPaid: { $sum: '$amountPaid' } } },
    ]),
  ]);

  const total = totals?.total ?? 0;
  const amountPaid = totals?.amountPaid ?? 0;
  return {
    items: result.items.map(withInvoiceBalance),
    pagination: result.pagination,
    totals: { total, amountPaid, balanceDue: Math.max(total - amountPaid, 0) },
    period: { range: period.range, label: period.label, from: period.from, to: period.to },
  };
}

/** Invoice + its payments + the deal's remaining amount (shown when adding a payment) */
export async function getInvoiceDetail(id) {
  const invoice = await Invoice.findById(id).populate(DETAIL_POPULATE).lean();
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const [payments, dealFinancials] = await Promise.all([
    Payment.find({ invoice: invoice._id }).sort({ date: -1, _id: -1 }).populate('signedBy', 'name').lean(),
    invoice.deal ? FinanceService.getDealFinancial(invoice.deal._id).catch(() => null) : null,
  ]);

  return {
    invoice: withInvoiceBalance(invoice),
    payments,
    deal: dealFinancials && {
      dealAmount: dealFinancials.dealAmount,
      received: dealFinancials.received,
      remaining: dealFinancials.remaining,
    },
  };
}

export async function createInvoice(data, user) {
  const deal = await findOpenDeal(data.deal);
  const settings = await getSettings();
  let invoice;

  // The counter and the invoice are saved together: no gaps, no duplicates
  await mongoose.connection.transaction(async (session) => {
    const { invoiceNumber, sequence } = await nextInvoiceNumber({ prefix: settings.invoicePrefix, session });
    [invoice] = await Invoice.create(
      [
        {
          invoiceNumber,
          sequence,
          client: deal.client,
          deal: deal._id,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          items: data.items,
          discount: data.discount ?? 0,
          taxPercent: data.taxPercent ?? settings.defaultTaxPercent,
          notes: data.notes ?? '',
          terms: data.terms || settings.invoiceTerms,
          status: data.status,
          sentAt: data.status === INVOICE_STATUS.SENT ? new Date() : null,
          signedBy: user._id,
          createdBy: user._id,
        },
      ],
      { session }
    );

    // A "Sent" invoice with a past due date is immediately Overdue
    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      invoice.status = invoice.deriveStatus();
      await invoice.save({ session });
    }
  });

  return invoice;
}

export async function updateInvoice(id, data) {
  const invoice = await findInvoiceOrThrow(id);

  if (String(invoice.deal) !== String(data.deal)) {
    if (invoice.amountPaid > 0 || (await Payment.exists({ invoice: invoice._id }))) {
      throw ApiError.badRequest('The deal cannot be changed after payments were recorded', {
        deal: 'Cannot change deal',
      });
    }
    const deal = await findOpenDeal(data.deal);
    invoice.deal = deal._id;
    invoice.client = deal.client;
  }

  invoice.set({
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate,
    items: data.items,
    discount: data.discount ?? 0,
    taxPercent: data.taxPercent ?? invoice.taxPercent,
    notes: data.notes ?? '',
    terms: data.terms ?? '',
  });

  if (data.status === INVOICE_STATUS.SENT && !invoice.sentAt) invoice.sentAt = new Date();
  invoice.status = data.status;
  invoice.recalculateTotals();
  invoice.status = invoice.deriveStatus();

  await invoice.save();
  return invoice;
}

export async function markAsSent(id) {
  const invoice = await findInvoiceOrThrow(id);
  if (invoice.status === INVOICE_STATUS.DRAFT) {
    invoice.status = INVOICE_STATUS.SENT;
    invoice.sentAt = invoice.sentAt ?? new Date();
    invoice.status = invoice.deriveStatus();
    await invoice.save();
  }
  return invoice;
}

/** New draft with the same deal, items, discount, tax and terms; dated today */
export async function duplicateInvoice(id, user) {
  const source = await findInvoiceOrThrow(id);
  const settings = await getSettings();
  const today = new Date();

  return createInvoice(
    {
      deal: source.deal,
      invoiceDate: today,
      dueDate: addDays(today, settings.defaultDueDays ?? 15),
      items: source.items.map(({ description, qty, rate }) => ({ description, qty, rate })),
      discount: source.discount,
      taxPercent: source.taxPercent,
      notes: source.notes,
      terms: source.terms,
      status: INVOICE_STATUS.DRAFT,
    },
    user
  );
}

export async function deleteInvoice(id) {
  const invoice = await findInvoiceOrThrow(id);
  if (await Payment.exists({ invoice: invoice._id })) {
    throw ApiError.conflict('This invoice has payments recorded, so it cannot be deleted. Delete the payments first.');
  }
  await invoice.softDelete();
}

/* ---------- invoice numbering (used by Settings) ---------- */

export async function getNextInvoiceNumber() {
  const counter = await Counter.findById(COUNTER.INVOICE).lean();
  return (counter?.seq ?? 0) + 1;
}

export async function setNextInvoiceNumber(nextNumber) {
  // Include soft-deleted invoices: their numbers are still "used"
  const [last] = await Invoice.find({ deletedAt: { $exists: true } })
    .sort({ sequence: -1 })
    .limit(1)
    .select('sequence')
    .lean();
  const highestUsed = last?.sequence ?? 0;

  if (nextNumber <= highestUsed) {
    throw ApiError.badRequest(`Next invoice number must be greater than ${highestUsed} (already used)`, {
      nextInvoiceNumber: `Must be greater than ${highestUsed}`,
    });
  }
  await Counter.setNext(COUNTER.INVOICE, nextNumber);
}