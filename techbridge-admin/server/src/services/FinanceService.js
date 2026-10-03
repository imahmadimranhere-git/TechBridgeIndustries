import mongoose from 'mongoose';
import env from '../config/env.js';
import { Client, CommissionPayout, Deal, Payment, Staff } from '../models/index.js';
import { COMMISSION_TYPE, DEAL_STATUS } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import { dateMatch, monthBuckets } from '../utils/dateRanges.js';
import { percentOf } from '../utils/money.js';

const { ObjectId } = mongoose.Types;

// Deal fields needed for commission math when a payment is joined to its deal
const DEAL_FIELDS = {
  client: 1,
  assignedStaff: 1,
  status: 1,
  dealAmount: 1,
  commissionType: 1,
  commissionRate: 1,
  commissionTotal: 1,
  deletedAt: 1,
};

/* ------------------------------------------------------------------ */
/* Option helpers                                                      */
/* ------------------------------------------------------------------ */

function toObjectId(value, name) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof ObjectId) return value;
  const raw = value._id ?? value;
  if (!mongoose.isValidObjectId(raw)) throw ApiError.badRequest(`${name} is not a valid id`);
  return new ObjectId(String(raw));
}

/**
 * Every public function accepts:
 *   { from, to }                      optional date range (Date or date string)
 *   { clientId, staffId, dealId }     optional filters
 */
function normalizeOptions({ from = null, to = null, clientId, staffId, dealId } = {}) {
  return {
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
    clientId: toObjectId(clientId, 'clientId'),
    staffId: toObjectId(staffId, 'staffId'),
    dealId: toObjectId(dealId, 'dealId'),
  };
}

function dealFilterMatch({ clientId, staffId, dealId }) {
  const match = {};
  if (clientId) match.client = clientId;
  if (staffId) match.assignedStaff = staffId;
  if (dealId) match._id = dealId;
  return match;
}

const sortDescending = (rows, field) =>
  rows.sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));

/* ------------------------------------------------------------------ */
/* Aggregation expression builders                                     */
/* ------------------------------------------------------------------ */

// Half-up rounding so results match Math.round in JS ($round uses banker's rounding)
const roundHalfUp = (expr) => ({ $floor: { $add: [expr, 0.5] } });

/**
 * Commission earned on a deal once `receivedExpr` (paisa) has been received in total.
 * `p` is where the deal's fields live: '$' on a deal document, '$deal.' on a joined payment.
 *
 *   no staff or cancelled -> 0
 *   fixed                 -> full fixed amount only when received >= deal amount
 *   percentage            -> received x rate / 100, never more than the commission total
 */
function earnedUpToExpr(receivedExpr, p = '$') {
  return {
    $cond: [
      {
        $or: [
          { $eq: [{ $ifNull: [`${p}assignedStaff`, null] }, null] },
          { $eq: [`${p}status`, DEAL_STATUS.CANCELLED] },
        ],
      },
      0,
      {
        $cond: [
          { $eq: [`${p}commissionType`, COMMISSION_TYPE.FIXED] },
          {
            $cond: [
              { $and: [{ $gt: [`${p}dealAmount`, 0] }, { $gte: [receivedExpr, `${p}dealAmount`] }] },
              `${p}commissionTotal`,
              0,
            ],
          },
          {
            $min: [
              roundHalfUp({ $divide: [{ $multiply: [receivedExpr, `${p}commissionRate`] }, 100] }),
              `${p}commissionTotal`,
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Payments joined to their (non-deleted) deal.
 * dateCondition is a ready-made { date: {...} } object or {}.
 */
function paymentsWithDealPipeline({ clientId, clientIds, dealId, staffId }, dateCondition = {}) {
  const match = { ...dateCondition };
  if (clientIds) match.client = { $in: clientIds };
  else if (clientId) match.client = clientId;
  if (dealId) match.deal = dealId;

  return [
    { $match: match },
    {
      $lookup: {
        from: Deal.collection.name,
        localField: 'deal',
        foreignField: '_id',
        as: 'deal',
        pipeline: [{ $project: DEAL_FIELDS }],
      },
    },
    { $unwind: '$deal' },
    { $match: { 'deal.deletedAt': null, ...(staffId ? { 'deal.assignedStaff': staffId } : {}) } },
  ];
}

/**
 * Every payment up to `to`, with the commission it earned.
 * A running total per deal tells us how much was received before and after each payment;
 * the commission earned BY this payment = earned(after) - earned(before).
 * Summing these per payment date gives exact commission for any period.
 * Callers add their own { $match } on `from` AFTER this pipeline.
 */
function paymentEventsPipeline(opts) {
  const upToCondition = opts.to ? { date: { $lte: opts.to } } : {};

  return [
    ...paymentsWithDealPipeline(opts, upToCondition),
    {
      $setWindowFields: {
        partitionBy: '$deal._id',
        sortBy: { date: 1, _id: 1 },
        output: {
          receivedAfter: { $sum: '$amount', window: { documents: ['unbounded', 'current'] } },
        },
      },
    },
    { $addFields: { receivedBefore: { $subtract: ['$receivedAfter', '$amount'] } } },
    {
      $addFields: {
        commissionEarned: {
          $subtract: [
            earnedUpToExpr('$receivedAfter', '$deal.'),
            earnedUpToExpr('$receivedBefore', '$deal.'),
          ],
        },
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

async function sumDealValue(opts) {
  const match = {
    status: { $ne: DEAL_STATUS.CANCELLED },
    ...dealFilterMatch(opts),
    ...dateMatch('startDate', opts),
  };
  const [row] = await Deal.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$dealAmount' } } },
  ]);
  return row?.total ?? 0;
}

async function sumReceivedAndEarned(opts) {
  const [row] = await Payment.aggregate([
    ...paymentEventsPipeline(opts),
    { $match: dateMatch('date', { from: opts.from }) },
    {
      $group: {
        _id: null,
        received: { $sum: '$amount' },
        commissionEarned: { $sum: '$commissionEarned' },
      },
    },
  ]);
  return { received: row?.received ?? 0, commissionEarned: row?.commissionEarned ?? 0 };
}

async function sumCommissionPaid(opts) {
  // Payouts belong to a staff member, not to a client or a deal
  if (opts.clientId || opts.dealId) return 0;
  const match = { ...dateMatch('date', opts) };
  if (opts.staffId) match.staff = opts.staffId;
  const [row] = await CommissionPayout.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return row?.total ?? 0;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** The 8 headline numbers, derived from 4 measured totals */
export function buildSummary({ totalDealValue, totalReceived, commissionEarned, commissionPaid }) {
  return {
    totalDealValue,
    totalReceived,
    remainingFromClients: totalDealValue - totalReceived,
    commissionEarned,
    commissionPaid,
    commissionPending: commissionEarned - commissionPaid,
    cashInHand: totalReceived - commissionPaid,
    netProfit: totalReceived - commissionEarned,
  };
}

export async function getSummary(options = {}) {
  const opts = normalizeOptions(options);
  const [totalDealValue, { received, commissionEarned }, commissionPaid] = await Promise.all([
    sumDealValue(opts),
    sumReceivedAndEarned(opts),
    sumCommissionPaid(opts),
  ]);
  return buildSummary({ totalDealValue, totalReceived: received, commissionEarned, commissionPaid });
}

/**
 * One row per deal with its money figures.
 * received / remaining / progress / commissionEarned are balances as of `to`;
 * receivedInPeriod / commissionEarnedInPeriod cover only the date range.
 */
export async function getDealFinancials(options = {}, { limit, activeInPeriodOnly = false } = {}) {
  const opts = normalizeOptions(options);
  const hasRange = Boolean(opts.from || opts.to);
  const paymentMatch = opts.to ? { date: { $lte: opts.to } } : {};
  const beforePeriodAmount = opts.from ? { $cond: [{ $lt: ['$date', opts.from] }, '$amount', 0] } : 0;

  const pipeline = [
    { $match: dealFilterMatch(opts) },
    {
      $lookup: {
        from: Payment.collection.name,
        localField: '_id',
        foreignField: 'deal',
        as: 'paid',
        pipeline: [
          { $match: paymentMatch },
          {
            $group: {
              _id: null,
              throughTo: { $sum: '$amount' },
              beforePeriod: { $sum: beforePeriodAmount },
              count: { $sum: 1 },
              lastPaymentAt: { $max: '$date' },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        received: { $ifNull: [{ $first: '$paid.throughTo' }, 0] },
        receivedBeforePeriod: { $ifNull: [{ $first: '$paid.beforePeriod' }, 0] },
        paymentsCount: { $ifNull: [{ $first: '$paid.count' }, 0] },
        lastPaymentAt: { $ifNull: [{ $first: '$paid.lastPaymentAt' }, null] },
      },
    },
    {
      $addFields: {
        receivedInPeriod: { $subtract: ['$received', '$receivedBeforePeriod'] },
        remaining: {
          $cond: [
            { $eq: ['$status', DEAL_STATUS.CANCELLED] },
            0,
            { $subtract: ['$dealAmount', '$received'] },
          ],
        },
        commissionEarned: earnedUpToExpr('$received'),
        commissionEarnedBeforePeriod: earnedUpToExpr('$receivedBeforePeriod'),
      },
    },
    {
      $addFields: {
        commissionEarnedInPeriod: { $subtract: ['$commissionEarned', '$commissionEarnedBeforePeriod'] },
      },
    },
  ];

  if (activeInPeriodOnly && hasRange) {
    // Deals that started in the period OR received money in it
    pipeline.push({
      $match: { $or: [dateMatch('startDate', opts), { receivedInPeriod: { $gt: 0 } }] },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: Client.collection.name,
        localField: 'client',
        foreignField: '_id',
        as: 'clientDoc',
        pipeline: [{ $project: { name: 1, companyName: 1 } }],
      },
    },
    {
      $lookup: {
        from: Staff.collection.name,
        localField: 'assignedStaff',
        foreignField: '_id',
        as: 'staffDoc',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    { $sort: { startDate: -1, _id: -1 } },
    ...(limit ? [{ $limit: limit }] : []),
    {
      $project: {
        title: 1,
        status: 1,
        startDate: 1,
        deadline: 1,
        createdAt: 1,
        dealAmount: 1,
        commissionType: 1,
        commissionRate: 1,
        commissionTotal: 1,
        received: 1,
        receivedInPeriod: 1,
        remaining: 1,
        commissionEarned: 1,
        commissionEarnedInPeriod: 1,
        paymentsCount: 1,
        lastPaymentAt: 1,
        client: { $first: '$clientDoc' },
        staff: { $first: '$staffDoc' },
      },
    }
  );

  const rows = await Deal.aggregate(pipeline);
  return rows.map((row) => ({ ...row, progress: percentOf(row.received, row.dealAmount) }));
}

export async function getDealFinancial(dealId, options = {}) {
  const [row] = await getDealFinancials({ ...options, dealId });
  if (!row) throw ApiError.notFound('Deal not found');
  return row;
}

/** One row per client: total deal value, received, remaining, number of deals */
export async function getClientFinancials(options = {}, { clientIds, sort = 'remaining', limit } = {}) {
  const opts = normalizeOptions(options);
  const ids = clientIds
    ? clientIds.map((id) => toObjectId(id, 'clientId'))
    : opts.clientId
      ? [opts.clientId]
      : null;

  const dealMatch = { ...dealFilterMatch({ ...opts, clientId: null }), ...dateMatch('startDate', opts) };
  if (ids) dealMatch.client = { $in: ids };

  const [dealRows, paymentRows, clients] = await Promise.all([
    Deal.aggregate([
      { $match: dealMatch },
      {
        $group: {
          _id: '$client',
          dealsCount: { $sum: 1 },
          totalDealValue: {
            $sum: { $cond: [{ $eq: ['$status', DEAL_STATUS.CANCELLED] }, 0, '$dealAmount'] },
          },
        },
      },
    ]),
    Payment.aggregate([
      ...paymentsWithDealPipeline({ ...opts, clientId: null, clientIds: ids }, dateMatch('date', opts)),
      { $group: { _id: '$client', received: { $sum: '$amount' } } },
    ]),
    Client.find(ids ? { _id: { $in: ids } } : {}).select('name companyName status').lean(),
  ]);

  const dealsByClient = new Map(dealRows.map((row) => [String(row._id), row]));
  const receivedByClient = new Map(paymentRows.map((row) => [String(row._id), row.received]));

  const rows = clients.map((client) => {
    const deals = dealsByClient.get(String(client._id));
    const totalDealValue = deals?.totalDealValue ?? 0;
    const received = receivedByClient.get(String(client._id)) ?? 0;
    return {
      client,
      dealsCount: deals?.dealsCount ?? 0,
      totalDealValue,
      received,
      remaining: totalDealValue - received,
    };
  });

  sortDescending(rows, sort);
  return limit ? rows.slice(0, limit) : rows;
}

/** One row per staff member: deals, commission earned, paid and pending */
export async function getStaffFinancials(options = {}, { staffIds, sort = 'commissionPending', limit } = {}) {
  const opts = normalizeOptions(options);
  const ids = staffIds
    ? staffIds.map((id) => toObjectId(id, 'staffId'))
    : opts.staffId
      ? [opts.staffId]
      : null;
  const staffCondition = ids ? { $in: ids } : { $ne: null };

  const [dealRows, earnedRows, paidRows, staffList] = await Promise.all([
    Deal.aggregate([
      { $match: { assignedStaff: staffCondition, ...dateMatch('startDate', opts) } },
      {
        $group: {
          _id: '$assignedStaff',
          dealsCount: { $sum: 1 },
          totalDealValue: {
            $sum: { $cond: [{ $eq: ['$status', DEAL_STATUS.CANCELLED] }, 0, '$dealAmount'] },
          },
        },
      },
    ]),
    Payment.aggregate([
      ...paymentEventsPipeline({ ...opts, staffId: null }),
      { $match: { ...dateMatch('date', { from: opts.from }), 'deal.assignedStaff': staffCondition } },
      { $group: { _id: '$deal.assignedStaff', commissionEarned: { $sum: '$commissionEarned' } } },
    ]),
    CommissionPayout.aggregate([
      { $match: { ...dateMatch('date', opts), ...(ids ? { staff: { $in: ids } } : {}) } },
      { $group: { _id: '$staff', commissionPaid: { $sum: '$amount' } } },
    ]),
    Staff.find(ids ? { _id: { $in: ids } } : {}).select('name status commissionType commissionRate').lean(),
  ]);

  const dealsByStaff = new Map(dealRows.map((row) => [String(row._id), row]));
  const earnedByStaff = new Map(earnedRows.map((row) => [String(row._id), row.commissionEarned]));
  const paidByStaff = new Map(paidRows.map((row) => [String(row._id), row.commissionPaid]));

  const rows = staffList.map((staff) => {
    const key = String(staff._id);
    const commissionEarned = earnedByStaff.get(key) ?? 0;
    const commissionPaid = paidByStaff.get(key) ?? 0;
    return {
      staff,
      dealsCount: dealsByStaff.get(key)?.dealsCount ?? 0,
      totalDealValue: dealsByStaff.get(key)?.totalDealValue ?? 0,
      commissionEarned,
      commissionPaid,
      commissionPending: commissionEarned - commissionPaid,
    };
  });

  sortDescending(rows, sort);
  return limit ? rows.slice(0, limit) : rows;
}

/** Month-by-month figures for the dashboard bar chart */
export async function getMonthlySeries(options = {}) {
  const opts = normalizeOptions(options);
  const buckets = monthBuckets(opts);
  const from = buckets[0].from;
  const to = buckets[buckets.length - 1].to;
  const monthKey = (field) => ({
    $dateToString: { format: '%Y-%m', date: field, timezone: env.APP_TIMEZONE },
  });

  const payoutMatch = { ...dateMatch('date', { from, to }) };
  if (opts.staffId) payoutMatch.staff = opts.staffId;

  const [eventRows, payoutRows] = await Promise.all([
    Payment.aggregate([
      ...paymentEventsPipeline({ ...opts, from, to }),
      { $match: dateMatch('date', { from }) },
      {
        $group: {
          _id: monthKey('$date'),
          received: { $sum: '$amount' },
          commissionEarned: { $sum: '$commissionEarned' },
        },
      },
    ]),
    opts.clientId || opts.dealId
      ? []
      : CommissionPayout.aggregate([
          { $match: payoutMatch },
          { $group: { _id: monthKey('$date'), commissionPaid: { $sum: '$amount' } } },
        ]),
  ]);

  const eventsByMonth = new Map(eventRows.map((row) => [row._id, row]));
  const payoutsByMonth = new Map(payoutRows.map((row) => [row._id, row.commissionPaid]));

  return buckets.map(({ key, label }) => {
    const received = eventsByMonth.get(key)?.received ?? 0;
    const commissionEarned = eventsByMonth.get(key)?.commissionEarned ?? 0;
    return {
      key,
      label,
      received,
      commissionEarned,
      commissionPaid: payoutsByMonth.get(key) ?? 0,
      netProfit: received - commissionEarned,
    };
  });
}

export default {
  buildSummary,
  getSummary,
  getDealFinancials,
  getDealFinancial,
  getClientFinancials,
  getStaffFinancials,
  getMonthlySeries,
};