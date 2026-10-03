import { format as formatDate } from 'date-fns';
import { resolveDateRange } from '../utils/dateRanges.js';
import { toMajor } from '../utils/money.js';
import FinanceService from './FinanceService.js';

const SUMMARY_ROWS = [
  ['Total Deal Value', 'totalDealValue'],
  ['Total Received from Clients', 'totalReceived'],
  ['Remaining from Clients', 'remainingFromClients'],
  ['Commission Earned by Staff', 'commissionEarned'],
  ['Commission Paid to Staff', 'commissionPaid'],
  ['Commission Pending to Staff', 'commissionPending'],
  ['Our Remaining Balance (Cash in Hand)', 'cashInHand'],
  ['Our Net Profit', 'netProfit'],
];

/** All report sections for one period */
export async function getReport(query = {}) {
  const period = resolveDateRange(query);
  const range = { from: period.from, to: period.to };

  const [summary, clients, deals, staff] = await Promise.all([
    FinanceService.getSummary(range),
    FinanceService.getClientFinancials(range),
    FinanceService.getDealFinancials(range, { activeInPeriodOnly: true }),
    FinanceService.getStaffFinancials(range),
  ]);

  return {
    period: { range: period.range, label: period.label, from: period.from, to: period.to },
    summary,
    summaryRows: SUMMARY_ROWS.map(([label, key]) => ({ label, key, amount: summary[key] })),
    clients,
    deals,
    staff,
  };
}

/* ---------------- CSV ---------------- */

// Plain numbers with 2 decimals so Excel can add them up
const amount = (minor) => toMajor(minor ?? 0).toFixed(2);

// Text starting with = + - @ could run as a formula in Excel ("CSV injection")
const safeText = (value) => {
  const text = value == null ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

const CSV_BUILDERS = {
  summary: (report) => report.summaryRows.map((row) => ({ Metric: row.label, Amount: amount(row.amount) })),

  clients: (report) =>
    report.clients.map((row) => ({
      Client: safeText(row.client.name),
      Company: safeText(row.client.companyName),
      Deals: row.dealsCount,
      'Total Deal': amount(row.totalDealValue),
      Received: amount(row.received),
      Remaining: amount(row.remaining),
    })),

  deals: (report) =>
    report.deals.map((row) => ({
      Deal: safeText(row.title),
      Client: safeText(row.client?.name),
      Staff: safeText(row.staff?.name),
      Status: row.status,
      'Deal Amount': amount(row.dealAmount),
      'Received (period)': amount(row.receivedInPeriod),
      'Received (total)': amount(row.received),
      Remaining: amount(row.remaining),
      'Commission Earned (period)': amount(row.commissionEarnedInPeriod),
    })),

  staff: (report) =>
    report.staff.map((row) => ({
      Staff: safeText(row.staff.name),
      Deals: row.dealsCount,
      'Commission Earned': amount(row.commissionEarned),
      'Commission Paid': amount(row.commissionPaid),
      'Commission Pending': amount(row.commissionPending),
    })),
};

export async function buildCsvExport(query) {
  const report = await getReport(query);
  const rows = CSV_BUILDERS[query.type](report);
  const filename = `techbridge-${query.type}-report-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
  return { rows, filename };
}