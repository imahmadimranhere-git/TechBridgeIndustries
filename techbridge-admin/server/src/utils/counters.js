import crypto from 'node:crypto';
import Counter from '../models/Counter.js';
import { DOCUMENT_CODE_PREFIX } from '../config/constants.js';

export const COUNTER = Object.freeze({
  INVOICE: 'invoice',
});

// No 0/O or 1/I so codes are easy to read and type from a printed page
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const padNumber = (number, width = 4) => String(number).padStart(width, '0');

// "tbi-" -> "TBI"
export const cleanPrefix = (prefix = 'TBI') =>
  String(prefix).trim().toUpperCase().replace(/[^A-Z0-9]+$/, '') || 'TBI';

export function randomCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Next invoice number, e.g. { sequence: 7, invoiceNumber: 'TBI-0007' } */
export async function nextInvoiceNumber({ prefix = 'TBI', session } = {}) {
  const sequence = await Counter.next(COUNTER.INVOICE, { session });
  return { sequence, invoiceNumber: `${cleanPrefix(prefix)}-${padNumber(sequence)}` };
}

/**
 * Verification code for a PDF, e.g. TBI-INV-0007-8F3K.
 * Pass `sequence` when the document already has a number (invoices);
 * otherwise a per-type counter is used (receipts, statements, ...).
 */
export async function generateVerificationCode({
  documentType,
  sequence,
  brandPrefix = 'TBI',
  session,
} = {}) {
  const typePrefix = DOCUMENT_CODE_PREFIX[documentType];
  if (!typePrefix) throw new Error(`Unknown document type: ${documentType}`);

  const number = sequence ?? (await Counter.next(`verification:${typePrefix}`, { session }));
  return `${cleanPrefix(brandPrefix)}-${typePrefix}-${padNumber(number)}-${randomCode(4)}`;
}