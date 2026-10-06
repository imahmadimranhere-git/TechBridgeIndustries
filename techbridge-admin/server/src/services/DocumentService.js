import { format } from 'date-fns';
import mongoose from 'mongoose';
import { DEAL_STATUS, DOCUMENT_TYPE, WELCOME_LETTER_ACTIONS } from '../config/constants.js';
import { Client, CommissionPayout, Deal, Invoice, Payment, Staff, WelcomeLetterLog } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { dateMatch, resolveDateRange } from '../utils/dateRanges.js';
import { fillLetterTemplate } from '../utils/letterTemplate.js';
import { formatMoney } from '../utils/money.js';
import FinanceService from './FinanceService.js';
import { createPdf } from './PdfService.js';
import { getReport } from './ReportService.js';
import { getSettings } from './SettingsService.js';
import { buildSignatory, documentOptionsFor, getLeadershipContacts } from './SignatoryService.js';
import { ensureVerification, issueVerification } from './VerificationService.js';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

// Payments and payouts have no number of their own; derive a stable, readable one
const shortRef = (prefix, id) => `${prefix}-${String(id).slice(-6).toUpperCase()}`;

const safeFileName = (text) =>
  String(text ?? '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'document';

// Only the fields a client-facing document may show (never commission)
const clientView = (client) =>
  client && {
    name: client.name,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    addressLine: [client.address, client.city, client.country].filter(Boolean).join(', '),
  };

const periodView = (period) => ({ range: period.range, label: period.label, from: period.from, to: period.to });

// "Ahmad Imran (Co-Founder & CEO)"
const withRole = (person) => (person.designation ? `${person.name} (${person.designation})` : person.name);

// ['A'] -> 'A', ['A', 'B'] -> 'A and B', ['A', 'B', 'C'] -> 'A, B and C'
function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Shared final step: signatory + (optional) verification code + PDF.
 * `verify` is a function so the code is only created when "show QR" is on for this document type.
 */
async function renderDocument({ template, documentType, data, signedBy, documentDate = new Date(), verify }) {
  const options = await documentOptionsFor(documentType);
  const [signatory, record] = await Promise.all([
    buildSignatory({ signedBy, documentType, date: documentDate }),
    options.showQr ? verify() : Promise.resolve(null),
  ]);

  const buffer = await createPdf(template, { ...data, signatory }, {
    verification: record ? { code: record.code } : null,
  });
  return { buffer, verificationCode: record?.code ?? null };
}

/* ------------------------------------------------------------------ */
/* 1. Invoice                                                          */
/* ------------------------------------------------------------------ */

export async function invoicePdf(invoiceId, user) {
  const invoice = await Invoice.findById(invoiceId).populate('client').populate('deal', 'title').lean();
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const balanceDue = Math.max(invoice.total - invoice.amountPaid, 0);
  // Same signer on every re-download
  const signedBy = invoice.signedBy ?? user?._id;
  const client = clientView(invoice.client);

  const result = await renderDocument({
    template: 'invoice',
    documentType: DOCUMENT_TYPE.INVOICE,
    signedBy,
    documentDate: invoice.invoiceDate,
    data: {
      title: `Invoice ${invoice.invoiceNumber}`,
      invoice: { ...invoice, balanceDue },
      client,
      deal: invoice.deal,
    },
    verify: () =>
      ensureVerification({
        documentType: DOCUMENT_TYPE.INVOICE,
        documentId: invoice._id,
        sequence: invoice.sequence,
        snapshot: {
          documentNumber: invoice.invoiceNumber,
          partyName: client?.companyName || client?.name || '',
          amount: invoice.total,
          documentDate: invoice.invoiceDate,
          status: invoice.status,
        },
        signedBy,
        issuedBy: user?._id,
      }),
  });

  return { ...result, filename: `Invoice-${safeFileName(invoice.invoiceNumber)}.pdf`, record: invoice };
}

/* ------------------------------------------------------------------ */
/* 2. Payment receipt                                                  */
/* ------------------------------------------------------------------ */

export async function receiptPdf(paymentId, user) {
  const payment = await Payment.findById(paymentId)
    .populate('client')
    .populate('deal', 'title')
    .populate('invoice', 'invoiceNumber')
    .lean();
  if (!payment) throw ApiError.notFound('Payment not found');

  const dealFinancials = payment.deal
    ? await FinanceService.getDealFinancial(payment.deal._id).catch(() => null)
    : null;

  const receiptNumber = shortRef('RCP', payment._id);
  const signedBy = payment.signedBy ?? user?._id;
  const client = clientView(payment.client);

  const result = await renderDocument({
    template: 'receipt',
    documentType: DOCUMENT_TYPE.PAYMENT_RECEIPT,
    signedBy,
    documentDate: payment.date,
    data: {
      title: `Receipt ${receiptNumber}`,
      receiptNumber,
      payment,
      client,
      invoiceNumber: payment.invoice?.invoiceNumber ?? null,
      // Client-facing summary only: no commission fields
      deal: dealFinancials && {
        title: dealFinancials.title,
        dealAmount: dealFinancials.dealAmount,
        received: dealFinancials.received,
        remaining: dealFinancials.remaining,
      },
    },
    verify: () =>
      ensureVerification({
        documentType: DOCUMENT_TYPE.PAYMENT_RECEIPT,
        documentId: payment._id,
        snapshot: {
          documentNumber: receiptNumber,
          partyName: client?.companyName || client?.name || '',
          amount: payment.amount,
          documentDate: payment.date,
          status: 'Received',
        },
        signedBy,
        issuedBy: user?._id,
      }),
  });

  return { ...result, filename: `Receipt-${receiptNumber}.pdf`, record: payment, number: receiptNumber };
}

/* ------------------------------------------------------------------ */
/* 3. Client statement (ledger with running balance)                   */
/* ------------------------------------------------------------------ */

async function buildLedger(clientId, period) {
  const deals = await Deal.find({ client: clientId }).sort({ startDate: 1, _id: 1 }).lean();
  const payments = await Payment.find({ deal: { $in: deals.map((deal) => deal._id) } })
    .sort({ date: 1, _id: 1 })
    .populate('deal', 'title')
    .populate('invoice', 'invoiceNumber')
    .lean();

  // Debit = what the client owes (agreed project amount), credit = what they paid
  const entries = [
    ...deals
      .filter((deal) => deal.status !== DEAL_STATUS.CANCELLED)
      .map((deal) => ({
        date: deal.startDate,
        description: `Project agreed: ${deal.title}`,
        reference: '',
        debit: deal.dealAmount,
        credit: 0,
        order: 0,
      })),
    ...payments.map((payment) => ({
      date: payment.date,
      description: `Payment received (${payment.method})${payment.deal ? ` for ${payment.deal.title}` : ''}`,
      reference: [payment.invoice?.invoiceNumber, payment.reference].filter(Boolean).join(' / '),
      debit: 0,
      credit: payment.amount,
      order: 1,
    })),
  ].sort((a, b) => a.date - b.date || a.order - b.order);

  const isBefore = (date) => Boolean(period.from) && date < period.from;
  const isInside = (date) => (!period.from || date >= period.from) && (!period.to || date <= period.to);

  const opening = entries.filter((entry) => isBefore(entry.date)).reduce((sum, e) => sum + e.debit - e.credit, 0);

  let balance = opening;
  const rows = [];
  for (const entry of entries) {
    if (!isInside(entry.date)) continue;
    balance += entry.debit - entry.credit;
    rows.push({ ...entry, balance });
  }

  return {
    opening,
    rows,
    totalDebit: rows.reduce((sum, row) => sum + row.debit, 0),
    totalCredit: rows.reduce((sum, row) => sum + row.credit, 0),
    closing: balance,
  };
}

export async function clientStatementPdf(clientId, query, user) {
  const client = await Client.findById(clientId).lean();
  if (!client) throw ApiError.notFound('Client not found');

  const period = resolveDateRange(query);
  const [ledger, summary, dealRows] = await Promise.all([
    buildLedger(client._id, period),
    FinanceService.getSummary({ clientId: client._id, to: period.to }),
    FinanceService.getDealFinancials({ clientId: client._id, to: period.to }),
  ]);

  const view = clientView(client);
  const signedBy = user?._id;

  const result = await renderDocument({
    template: 'client-statement',
    documentType: DOCUMENT_TYPE.CLIENT_STATEMENT,
    signedBy,
    data: {
      title: `Statement ${client.name}`,
      client: view,
      period: periodView(period),
      stats: {
        totalDealValue: summary.totalDealValue,
        totalReceived: summary.totalReceived,
        remaining: summary.remainingFromClients,
      },
      // Client-facing: no commission fields
      deals: dealRows.map((row) => ({
        title: row.title,
        status: row.status,
        startDate: row.startDate,
        dealAmount: row.dealAmount,
        received: row.received,
        remaining: row.remaining,
      })),
      ledger,
    },
    verify: () =>
      issueVerification({
        documentType: DOCUMENT_TYPE.CLIENT_STATEMENT,
        documentId: client._id,
        snapshot: {
          documentNumber: period.label,
          partyName: view.companyName || view.name,
          amount: ledger.closing,
          documentDate: new Date(),
          status: 'Issued',
          periodFrom: period.from,
          periodTo: period.to,
        },
        signedBy,
        issuedBy: user?._id,
      }),
  });

  return {
    ...result,
    filename: `Statement-${safeFileName(client.companyName || client.name)}-${safeFileName(period.label)}.pdf`,
    record: client,
  };
}

/* ------------------------------------------------------------------ */
/* 4. Commission payout slip                                           */
/* ------------------------------------------------------------------ */

export async function payoutSlipPdf(payoutId, user) {
  const payout = await CommissionPayout.findById(payoutId).populate('staff').lean();
  if (!payout) throw ApiError.notFound('Payout not found');

  const [summary] = payout.staff
    ? await FinanceService.getStaffFinancials({}, { staffIds: [payout.staff._id] })
    : [];
  const slipNumber = shortRef('PAY', payout._id);
  const signedBy = payout.signedBy ?? user?._id;

  const result = await renderDocument({
    template: 'payout-slip',
    documentType: DOCUMENT_TYPE.PAYOUT_SLIP,
    signedBy,
    documentDate: payout.date,
    data: {
      title: `Payout ${slipNumber}`,
      slipNumber,
      payout,
      staff: payout.staff,
      summary: summary ?? { commissionEarned: 0, commissionPaid: 0, commissionPending: 0 },
    },
    verify: () =>
      ensureVerification({
        documentType: DOCUMENT_TYPE.PAYOUT_SLIP,
        documentId: payout._id,
        snapshot: {
          documentNumber: slipNumber,
          partyName: payout.staff?.name ?? '',
          amount: payout.amount,
          documentDate: payout.date,
          status: 'Paid',
        },
        signedBy,
        issuedBy: user?._id,
      }),
  });

  return { ...result, filename: `Payout-${slipNumber}.pdf`, record: payout, number: slipNumber };
}

/* ------------------------------------------------------------------ */
/* 5. Commission statement (per staff, per period)                     */
/* ------------------------------------------------------------------ */

export async function commissionStatementPdf(staffId, query, user) {
  const staff = await Staff.findById(staffId).lean();
  if (!staff) throw ApiError.notFound('Staff member not found');

  const period = resolveDateRange(query);
  const range = { from: period.from, to: period.to };

  const [[inPeriod], deals, payouts, [overall]] = await Promise.all([
    FinanceService.getStaffFinancials(range, { staffIds: [staff._id] }),
    FinanceService.getDealFinancials({ staffId: staff._id, ...range }, { activeInPeriodOnly: true }),
    CommissionPayout.find({ staff: staff._id, ...dateMatch('date', range) }).sort({ date: 1, _id: 1 }).lean(),
    FinanceService.getStaffFinancials({}, { staffIds: [staff._id] }),
  ]);

  const signedBy = user?._id;

  const result = await renderDocument({
    template: 'commission-statement',
    documentType: DOCUMENT_TYPE.COMMISSION_STATEMENT,
    signedBy,
    data: {
      title: `Commission statement ${staff.name}`,
      staff,
      period: periodView(period),
      stats: {
        earnedInPeriod: inPeriod?.commissionEarned ?? 0,
        paidInPeriod: inPeriod?.commissionPaid ?? 0,
        pendingOverall: overall?.commissionPending ?? 0,
      },
      deals: deals.map((row) => ({ ...row, clientName: row.client?.companyName || row.client?.name || '' })),
      payouts,
      payoutsTotal: payouts.reduce((sum, payout) => sum + payout.amount, 0),
    },
    verify: () =>
      issueVerification({
        documentType: DOCUMENT_TYPE.COMMISSION_STATEMENT,
        documentId: staff._id,
        snapshot: {
          documentNumber: period.label,
          partyName: staff.name,
          amount: inPeriod?.commissionEarned ?? 0,
          documentDate: new Date(),
          status: 'Issued',
          periodFrom: period.from,
          periodTo: period.to,
        },
        signedBy,
        issuedBy: user?._id,
      }),
  });

  return {
    ...result,
    filename: `Commission-${safeFileName(staff.name)}-${safeFileName(period.label)}.pdf`,
    record: staff,
  };
}

/* ------------------------------------------------------------------ */
/* 6. Welcome letter                                                   */
/* ------------------------------------------------------------------ */

export async function welcomeLetterPdf(clientId, { dealId } = {}, user) {
  const client = await Client.findById(clientId).lean();
  if (!client) throw ApiError.notFound('Client not found');

  let deal = null;
  if (dealId) {
    deal = await Deal.findOne({ _id: dealId, client: client._id }).lean();
    if (!deal) throw ApiError.badRequest('Selected deal does not belong to this client', { dealId: 'Invalid deal' });
  }

  const settings = await getSettings();
  // Points of contact: the admin creating the letter first, then the other founders from Settings
  const contacts = await getLeadershipContacts(user?._id ?? settings.defaultSignatoryId);
  const primary = contacts[0];
  const letterDate = new Date();

  const paragraphs = fillLetterTemplate(settings.welcomeLetterTemplate, {
    client_name: client.name,
    client_company: client.companyName || client.name,
    date: format(letterDate, 'dd MMMM yyyy'),
    company_name: settings.companyName,
    contact_person: primary ? withRole(primary) : settings.companyName,
    team: contacts.length ? joinNames(contacts.map(withRole)) : settings.companyName,
    deal_title: deal?.title ?? 'your project',
    deal_amount: deal ? formatMoney(deal.dealAmount, { symbol: settings.currencySymbol }) : 'the agreed amount',
  });

  const view = clientView(client);
  const signedBy = user?._id;

  const result = await renderDocument({
    template: 'welcome-letter',
    documentType: DOCUMENT_TYPE.WELCOME_LETTER,
    signedBy,
    documentDate: letterDate,
    data: {
      title: `Welcome ${client.name}`,
      client: view,
      letterDate,
      paragraphs,
      services: settings.servicesList ?? [],
      // Client-facing deal summary: no commission
      deal: deal && {
        title: deal.title,
        dealAmount: deal.dealAmount,
        startDate: deal.startDate,
        deadline: deal.deadline,
      },
      contacts,
    },
    verify: () =>
      ensureVerification({
        documentType: DOCUMENT_TYPE.WELCOME_LETTER,
        documentId: client._id,
        snapshot: {
          documentNumber: deal?.title ?? 'Welcome letter',
          partyName: view.companyName || view.name,
          documentDate: letterDate,
          status: 'Issued',
        },
        signedBy,
        issuedBy: user?._id,
      }),
  });

  return {
    ...result,
    filename: `Welcome-Letter-${safeFileName(client.companyName || client.name)}.pdf`,
    record: client,
    deal,
  };
}

/** History entry for a welcome letter (download now, email in Phase 13) */
export function recordWelcomeLetter({
  clientId,
  dealId = null,
  action,
  sentTo = '',
  subject = '',
  verificationCode = null,
  status = 'Success',
  errorMessage = '',
  user,
}) {
  if (!WELCOME_LETTER_ACTIONS.includes(action)) throw new Error(`Unknown welcome letter action: ${action}`);
  return WelcomeLetterLog.create({
    client: clientId,
    deal: dealId,
    action,
    sentTo,
    subject,
    verificationCode,
    status,
    errorMessage,
    signedBy: user?._id ?? null,
    sentBy: user?._id ?? null,
  });
}

/* ------------------------------------------------------------------ */
/* 7. Financial report                                                 */
/* ------------------------------------------------------------------ */

export async function financialReportPdf(query, user) {
  const report = await getReport(query);
  const settings = await getSettings();
  const signedBy = user?._id;

  const result = await renderDocument({
    template: 'financial-report',
    documentType: DOCUMENT_TYPE.FINANCIAL_REPORT,
    signedBy,
    data: { title: `Financial report ${report.period.label}`, report },
    verify: () =>
      issueVerification({
        documentType: DOCUMENT_TYPE.FINANCIAL_REPORT,
        // A report is not tied to one record; it gets its own id
        documentId: new mongoose.Types.ObjectId(),
        snapshot: {
          documentNumber: report.period.label,
          partyName: settings.companyName,
          amount: report.summary.netProfit,
          documentDate: new Date(),
          status: 'Issued',
          periodFrom: report.period.from,
          periodTo: report.period.to,
        },
        signedBy,
        issuedBy: user?._id,
      }),
  });

  return { ...result, filename: `Financial-Report-${safeFileName(report.period.label)}.pdf` };
}
