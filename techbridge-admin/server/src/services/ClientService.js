import mongoose from 'mongoose';
import { Client, Deal, Invoice, Note, Payment, WelcomeLetterLog } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { paginate, paginateArray } from '../utils/pagination.js';
import { searchFilter } from '../utils/search.js';
import { withInvoiceBalance } from '../utils/serializers.js';
import FinanceService from './FinanceService.js';

const SEARCH_FIELDS = ['name', 'companyName', 'email', 'phone', 'whatsapp', 'city'];
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
};

const pickFinancials = (row) => ({
  dealsCount: row?.dealsCount ?? 0,
  totalDealValue: row?.totalDealValue ?? 0,
  received: row?.received ?? 0,
  remaining: row?.remaining ?? 0,
});

export async function findClientOrThrow(id) {
  const client = await Client.findById(id);
  if (!client) throw ApiError.notFound('Client not found');
  return client;
}

/** Clients list with Total Deal / Received / Remaining for each row */
export async function listClients({ page, limit, search, status, source, sort }) {
  const filter = { ...searchFilter(search, SEARCH_FIELDS) };
  if (status) filter.status = status;
  if (source) filter.source = source;

  // Sorting by money needs every matching client's totals first
  if (sort === 'remaining') {
    const ids = (await Client.find(filter).select('_id').lean()).map((client) => client._id);
    const rows = ids.length ? await FinanceService.getClientFinancials({}, { clientIds: ids }) : [];
    const pageRows = paginateArray(rows, page, limit);
    const clients = await Client.find({ _id: { $in: pageRows.items.map((row) => row.client._id) } }).lean();
    const byId = new Map(clients.map((client) => [String(client._id), client]));
    return {
      items: pageRows.items.map((row) => ({ ...byId.get(String(row.client._id)), financials: pickFinancials(row) })),
      pagination: pageRows.pagination,
    };
  }

  const { items, pagination } = await paginate(Client, filter, { page, limit, sort: SORTS[sort] });
  const rows = items.length
    ? await FinanceService.getClientFinancials({}, { clientIds: items.map((client) => client._id) })
    : [];
  const byClient = new Map(rows.map((row) => [String(row.client._id), row]));

  return {
    items: items.map((client) => ({ ...client, financials: pickFinancials(byClient.get(String(client._id))) })),
    pagination,
  };
}

/** Everything the client profile page needs, in one response */
export async function getClientProfile(id) {
  const client = await findClientOrThrow(id);

  const [summary, deals, payments, invoices, notes, welcomeLetters] = await Promise.all([
    FinanceService.getSummary({ clientId: client._id }),
    FinanceService.getDealFinancials({ clientId: client._id }),
    Payment.find({ client: client._id })
      .sort({ date: -1, _id: -1 })
      .populate('deal', 'title')
      .populate('invoice', 'invoiceNumber')
      .lean(),
    Invoice.find({ client: client._id })
      .sort({ invoiceDate: -1 })
      .select('invoiceNumber invoiceDate dueDate total amountPaid status deal')
      .populate('deal', 'title')
      .lean(),
    Note.find({ notableType: 'Client', notableId: client._id }).sort({ date: -1 }).lean(),
    WelcomeLetterLog.find({ client: client._id }).sort({ createdAt: -1 }).limit(20).populate('sentBy', 'name').lean(),
  ]);

  return {
    client,
    stats: {
      totalDealValue: summary.totalDealValue,
      totalReceived: summary.totalReceived,
      remaining: summary.remainingFromClients,
      dealsCount: deals.length,
    },
    deals,
    payments: payments.filter((payment) => payment.deal),
    invoices: invoices.map(withInvoiceBalance),
    notes,
    welcomeLetters,
  };
}

export function createClient(data, user) {
  return Client.create({ ...data, createdBy: user._id });
}

export async function updateClient(id, data) {
  const client = await findClientOrThrow(id);
  client.set(data);
  await client.save();
  return client;
}

/** Soft delete (with its deals and invoices). Blocked once money has been received. */
export async function deleteClient(id) {
  const client = await findClientOrThrow(id);

  if (await Payment.exists({ client: client._id })) {
    throw ApiError.conflict(
      'This client has payments recorded, so it cannot be deleted. Mark the client as Inactive instead.'
    );
  }

  await mongoose.connection.transaction(async (session) => {
    const now = new Date();
    await Deal.updateMany({ client: client._id }, { $set: { deletedAt: now } }, { session });
    await Invoice.updateMany({ client: client._id }, { $set: { deletedAt: now } }, { session });
    client.deletedAt = now;
    await client.save({ session, validateBeforeSave: false });
  });
}