import mongoose from 'mongoose';
import { COMMISSION_TYPE } from '../config/constants.js';
import { Client, Deal, Invoice, Note, Payment, Staff } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { paginateArray } from '../utils/pagination.js';
import { withInvoiceBalance } from '../utils/serializers.js';
import FinanceService from './FinanceService.js';

export async function findDealOrThrow(id) {
  const deal = await Deal.findById(id);
  if (!deal) throw ApiError.notFound('Deal not found');
  return deal;
}

async function loadStaff(staffId) {
  if (!staffId) return null;
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw ApiError.badRequest('Selected staff member was not found', { assignedStaff: 'Staff member not found' });
  }
  return staff;
}

/**
 * Commission to store on the deal:
 *  - no staff                     -> nothing
 *  - explicit override in request -> use it
 *  - same staff as before         -> keep the rate already on the deal
 *  - new staff                    -> copy that staff member's current default
 */
function resolveCommission(data, staff, currentDeal = null) {
  if (!staff) return { commissionType: COMMISSION_TYPE.PERCENTAGE, commissionRate: 0 };
  if (data.commissionType !== undefined) {
    return { commissionType: data.commissionType, commissionRate: data.commissionRate };
  }
  if (currentDeal && String(currentDeal.assignedStaff) === String(staff._id)) {
    return { commissionType: currentDeal.commissionType, commissionRate: currentDeal.commissionRate };
  }
  return { commissionType: staff.commissionType, commissionRate: staff.commissionRate };
}

const withoutCommissionInput = ({ commissionType: _type, commissionRate: _rate, ...rest }) => rest;

export async function listDeals({ page, limit, search, status, clientId, staffId }) {
  let rows = await FinanceService.getDealFinancials({ clientId, staffId });
  if (status) rows = rows.filter((row) => row.status === status);

  const term = search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter((row) =>
      [row.title, row.client?.name, row.client?.companyName, row.staff?.name].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }
  return paginateArray(rows, page, limit);
}

export async function getDealDetail(id) {
  const deal = await Deal.findById(id)
    .populate('client', 'name companyName email phone')
    .populate('assignedStaff', 'name')
    .lean();
  if (!deal) throw ApiError.notFound('Deal not found');

  const [financials, payments, invoices, notes] = await Promise.all([
    FinanceService.getDealFinancial(deal._id),
    Payment.find({ deal: deal._id })
      .sort({ date: -1, _id: -1 })
      .populate('invoice', 'invoiceNumber')
      .populate('signedBy', 'name')
      .lean(),
    Invoice.find({ deal: deal._id })
      .sort({ invoiceDate: -1 })
      .select('invoiceNumber invoiceDate dueDate total amountPaid status')
      .lean(),
    Note.find({ notableType: 'Deal', notableId: deal._id }).sort({ date: -1 }).lean(),
  ]);

  return { deal, financials, payments, invoices: invoices.map(withInvoiceBalance), notes };
}

export async function createDeal(data, user) {
  if (!(await Client.exists({ _id: data.client }))) {
    throw ApiError.badRequest('Selected client was not found', { client: 'Client not found' });
  }
  const staff = await loadStaff(data.assignedStaff);
  if (staff && staff.status !== 'Active') {
    throw ApiError.badRequest('This staff member is inactive', { assignedStaff: 'Staff member is inactive' });
  }

  return Deal.create({
    ...withoutCommissionInput(data),
    assignedStaff: staff?._id ?? null,
    ...resolveCommission(data, staff),
    createdBy: user._id,
  });
}

export async function updateDeal(id, data) {
  const deal = await findDealOrThrow(id);

  if (String(deal.client) !== String(data.client)) {
    const [hasPayments, hasInvoices] = await Promise.all([
      Payment.exists({ deal: deal._id }),
      Invoice.exists({ deal: deal._id }),
    ]);
    if (hasPayments || hasInvoices) {
      throw ApiError.badRequest('The client cannot be changed after invoices or payments exist', {
        client: 'Cannot change client',
      });
    }
    if (!(await Client.exists({ _id: data.client }))) {
      throw ApiError.badRequest('Selected client was not found', { client: 'Client not found' });
    }
  }

  const staff = await loadStaff(data.assignedStaff);
  deal.set({
    ...withoutCommissionInput(data),
    assignedStaff: staff?._id ?? null,
    ...resolveCommission(data, staff, deal),
  });
  await deal.save();
  return deal;
}

export async function deleteDeal(id) {
  const deal = await findDealOrThrow(id);
  if (await Payment.exists({ deal: deal._id })) {
    throw ApiError.conflict('This deal has payments recorded, so it cannot be deleted. Mark it as Cancelled instead.');
  }

  await mongoose.connection.transaction(async (session) => {
    const now = new Date();
    await Invoice.updateMany({ deal: deal._id }, { $set: { deletedAt: now } }, { session });
    deal.deletedAt = now;
    await deal.save({ session, validateBeforeSave: false });
  });
}