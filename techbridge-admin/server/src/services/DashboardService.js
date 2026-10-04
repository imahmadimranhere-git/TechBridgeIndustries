import { DEAL_STATUS, INVOICE_STATUS } from '../config/constants.js';
import { Client, CommissionPayout, Deal, Invoice, Note, Payment, Staff } from '../models/index.js';
import { dateMatch, resolveDateRange } from '../utils/dateRanges.js';
import FinanceService from './FinanceService.js';

const RECENT_LIMIT = 5;

/** Everything the dashboard shows, in ONE response (spec: GET /api/dashboard?range=...) */
export async function getDashboard(query = {}) {
  const period = resolveDateRange(query);
  const range = { from: period.from, to: period.to };

  const [
    summary,
    monthly,
    activeDeals,
    overdueRows,
    totalClients,
    totalStaff,
    clientBalances,
    recentPayments,
    recentPayouts,
    recentDeals,
    topStaff,
    recentNotes,
  ] = await Promise.all([
    FinanceService.getSummary(range),
    FinanceService.getMonthlySeries(range),
    Deal.countDocuments({ status: { $in: [DEAL_STATUS.PENDING, DEAL_STATUS.IN_PROGRESS] } }),
    Invoice.aggregate([
      { $match: { status: INVOICE_STATUS.OVERDUE } },
      { $group: { _id: null, count: { $sum: 1 }, balance: { $sum: { $subtract: ['$total', '$amountPaid'] } } } },
    ]),
    Client.countDocuments(),
    Staff.countDocuments(),
    // Balances are "as of today", whatever period is selected
    FinanceService.getClientFinancials({}, { sort: 'remaining', limit: RECENT_LIMIT }),
    Payment.find(dateMatch('date', range))
      .sort({ date: -1, _id: -1 })
      .limit(RECENT_LIMIT)
      .populate('client', 'name companyName')
      .populate('deal', 'title')
      .lean(),
    CommissionPayout.find(dateMatch('date', range))
      .sort({ date: -1, _id: -1 })
      .limit(RECENT_LIMIT)
      .populate('staff', 'name')
      .lean(),
    Deal.find(dateMatch('startDate', range))
      .sort({ startDate: -1, _id: -1 })
      .limit(RECENT_LIMIT)
      .select('title dealAmount status startDate client assignedStaff')
      .populate('client', 'name companyName')
      .populate('assignedStaff', 'name')
      .lean(),
    FinanceService.getStaffFinancials(range, { sort: 'commissionEarned', limit: RECENT_LIMIT }),
    Note.find()
      .sort({ date: -1, _id: -1 })
      .limit(RECENT_LIMIT)
      .populate('notableId', 'name title')
      .lean(),
  ]);

  const [overdue] = overdueRows;

  return {
    period: { range: period.range, label: period.label, from: period.from, to: period.to },
    // Row 1: the four big coloured cards
    cards: {
      totalReceived: summary.totalReceived,
      commissionPaid: summary.commissionPaid,
      commissionPending: summary.commissionPending,
      cashInHand: summary.cashInHand,
      netProfit: summary.netProfit,
    },
    // Row 2: secondary cards
    stats: {
      totalDealValue: summary.totalDealValue,
      remainingFromClients: summary.remainingFromClients,
      activeDeals,
      overdueInvoices: overdue?.count ?? 0,
      overdueAmount: overdue?.balance ?? 0,
      commissionPending: summary.commissionPending,
      totalClients,
      totalStaff,
    },
    // Row 3: charts
    charts: {
      monthly,
      share: { staffCommission: summary.commissionEarned, ourShare: summary.netProfit },
    },
    // Row 4: tables
    tables: {
      topRemainingClients: clientBalances.filter((row) => row.remaining > 0),
      recentPayments,
      recentPayouts,
      recentDeals,
      topStaff,
      recentNotes,
    },
    summary,
  };
}