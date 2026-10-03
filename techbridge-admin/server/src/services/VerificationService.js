import env from '../config/env.js';
import { DOCUMENT_TYPE } from '../config/constants.js';
import { DocumentVerification, Invoice } from '../models/index.js';
import { generateVerificationCode } from '../utils/counters.js';
import { getSettings } from './SettingsService.js';

const MAX_ATTEMPTS = 5;
const CODE_PATTERN = /^[A-Z0-9]{1,10}-[A-Z]{3}-\d{4,}-[A-Z0-9]{4}$/;

const DOCUMENT_LABELS = {
  [DOCUMENT_TYPE.INVOICE]: 'Invoice',
  [DOCUMENT_TYPE.PAYMENT_RECEIPT]: 'Payment Receipt',
  [DOCUMENT_TYPE.CLIENT_STATEMENT]: 'Client Statement',
  [DOCUMENT_TYPE.PAYOUT_SLIP]: 'Commission Payout Slip',
  [DOCUMENT_TYPE.COMMISSION_STATEMENT]: 'Commission Statement',
  [DOCUMENT_TYPE.WELCOME_LETTER]: 'Welcome Letter',
  [DOCUMENT_TYPE.FINANCIAL_REPORT]: 'Financial Report',
};

// Internal documents: the public page confirms they are genuine but never shows the amount
const HIDE_AMOUNT = new Set([
  DOCUMENT_TYPE.PAYOUT_SLIP,
  DOCUMENT_TYPE.COMMISSION_STATEMENT,
  DOCUMENT_TYPE.FINANCIAL_REPORT,
]);

export const verificationUrl = (code) => `${env.FRONTEND_URL}/verify/${encodeURIComponent(code)}`;

/**
 * Creates the verification record for a PDF and returns it (with .code).
 * snapshot = minimal public facts: documentNumber, partyName, amount, documentDate, status, periodFrom, periodTo
 */
export async function issueVerification({
  documentType,
  documentId,
  sequence,
  snapshot = {},
  signedBy = null,
  issuedBy = null,
}) {
  const { invoicePrefix } = await getSettings();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const code = await generateVerificationCode({ documentType, sequence, brandPrefix: invoicePrefix });
    try {
      return await DocumentVerification.create({
        code,
        documentType,
        documentId,
        snapshot,
        signedBy,
        issuedBy,
      });
    } catch (err) {
      // Astronomically rare random collision: just try another code
      if (err.code !== 11000 || attempt === MAX_ATTEMPTS) throw err;
    }
  }
  return null;
}

// Invoices change after issue (payments), so show their current status
async function currentStatus(record) {
  if (record.documentType !== DOCUMENT_TYPE.INVOICE) return null;
  const invoice = await Invoice.findOne({ _id: record.documentId, deletedAt: { $exists: true } })
    .select('status deletedAt')
    .lean();
  if (!invoice) return null;
  return invoice.deletedAt ? 'Cancelled' : invoice.status;
}

/** Minimal, public-safe view of a document. Returns null when the code is unknown. */
export async function lookupPublic(rawCode) {
  const code = String(rawCode ?? '').trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return null;

  const record = await DocumentVerification.findOne({ code }).lean();
  if (!record) return null;

  const [{ companyName, currencySymbol }, liveStatus] = await Promise.all([
    getSettings(),
    currentStatus(record),
  ]);
  const snapshot = record.snapshot ?? {};

  return {
    code: record.code,
    documentType: record.documentType,
    documentLabel: DOCUMENT_LABELS[record.documentType] ?? record.documentType,
    documentNumber: snapshot.documentNumber || null,
    partyName: snapshot.partyName || null,
    amount: HIDE_AMOUNT.has(record.documentType) ? null : (snapshot.amount ?? null),
    currencySymbol,
    documentDate: snapshot.documentDate ?? null,
    periodFrom: snapshot.periodFrom ?? null,
    periodTo: snapshot.periodTo ?? null,
    status: liveStatus ?? snapshot.status ?? null,
    issuedAt: record.issuedAt,
    isValid: !record.isRevoked,
    issuer: companyName,
  };
}

export default { issueVerification, lookupPublic, verificationUrl };