import { CommissionPayout, Deal, Note, Staff } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { dateMatch, resolveDateRange } from '../utils/dateRanges.js';
import { formatMoney } from '../utils/money.js';
import { paginate } from '../utils/pagination.js';
import { searchFilter } from '../utils/search.js';
import FinanceService from './FinanceService.js';
import { getSettings } from './SettingsService.js';

const pickFinancials = (row) => ({
  dealsCount: row?.dealsCount ?? 0,
  commissionEarned: row?.commissionEarned ?? 0,
  commissionPaid: row?.commissionPaid ?? 0,
  commissionPending: row?.commissionPending ?? 0,
});

async function moneyFormatter() {
  const { currencySymbol } = await getSettings();
  return (value) => formatMoney(value, { symbol: currencySymbol });
}

export async function findStaffOrThrow(id) {
  const staff = await Staff.findById(id);
  if (!staff) throw ApiError.notFound('Staff member not found');
  return staff;
}

export async function listStaff({ page, limit, search, status }) {
  const filter = { ...searchFilter(search, ['name', 'email', 'phone', 'cnic']) };
  if (status) filter.status = status;

  const { items, pagination } = await paginate(Staff, filter, { page, limit, sort: { name: 1, _id: 1 } });
  const rows = items.length
    ? await FinanceService.getStaffFinancials({}, { staffIds: items.map((staff) => staff._id) })
    : [];
  const byStaff = new Map(rows.map((row) => [String(row.staff._id), row]));

  return {
    items: items.map((staff) => ({ ...staff, financials: pickFinancials(byStaff.get(String(staff._id))) })),
    pagination,
  };
}

/** Staff profile: cards (optionally for a period), deals, payouts, notes */
export async function getStaffProfile(id, query = {}) {
  const staff = await findStaffOrThrow(id);
  const period = resolveDateRange(query);
  const range = { from: period.from, to: period.to };

  const [[financials], deals, payouts, notes] = await Promise.all([
    FinanceService.getStaffFinancials(range, { staffIds: [staff._id] }),
    FinanceService.getDealFinancials({ staffId: staff._id }),
    CommissionPayout.find({ staff: staff._id, ...dateMatch('date', range) })
      .sort({ date: -1, _id: -1 })
      .populate('signedBy', 'name')
      .lean(),
    Note.find({ notableType: 'Staff', notableId: staff._id }).sort({ date: -1 }).lean(),
  ]);

  return {
    staff,
    period: { range: period.range, label: period.label, from: period.from, to: period.to },
    financials: pickFinancials(financials),
    deals,
    payouts,
    notes,
  };
}

export function createStaff(data) {
  return Staff.create({ ...data, joiningDate: data.joiningDate ?? new Date() });
}

// Changing the default rate never touches existing deals (they keep their copied rate)
export async function updateStaff(id, data) {
  const staff = await findStaffOrThrow(id);
  staff.set({ ...data, joiningDate: data.joiningDate ?? staff.joiningDate });
  await staff.save();
  return staff;
}

export async function deleteStaff(id) {
  const staff = await findStaffOrThrow(id);
  const [hasDeals, hasPayouts] = await Promise.all([
    Deal.exists({ assignedStaff: staff._id }),
    CommissionPayout.exists({ staff: staff._id }),
  ]);
  if (hasDeals || hasPayouts) {
    throw ApiError.conflict(
      'This staff member has deals or payouts, so they cannot be deleted. Mark them as Inactive instead.'
    );
  }
  await staff.softDelete();
}

/* ---------------- Commission payouts ---------------- */

export async function createPayout(staffId, data, user) {
  const staff = await findStaffOrThrow(staffId);
  const [row] = await FinanceService.getStaffFinancials({}, { staffIds: [staff._id] });
  const pending = row?.commissionPending ?? 0;

  if (data.amount > pending && !data.confirmOverpay) {
    const format = await moneyFormatter();
    throw ApiError.needsConfirmation(
      `This payout of ${format(data.amount)} is more than ${staff.name}'s pending commission (${format(pending)}). Save it anyway?`,
      { pending }
    );
  }

  const { confirmOverpay: _confirm, ...fields } = data;
  return CommissionPayout.create({ ...fields, staff: staff._id, signedBy: user._id, createdBy: user._id });
}

export async function listPayouts({ page, limit, staffId, range, from, to }) {
  const period = resolveDateRange({ range, from, to });
  const filter = { ...dateMatch('date', period) };
  if (staffId) filter.staff = staffId;

  return paginate(CommissionPayout, filter, {
    page,
    limit,
    sort: { date: -1, _id: -1 },
    populate: [
      { path: 'staff', select: 'name' },
      { path: 'signedBy', select: 'name designation' },
    ],
  });
}

export async function deletePayout(id) {
  const payout = await CommissionPayout.findById(id);
  if (!payout) throw ApiError.notFound('Payout not found');
  await payout.deleteOne();
}