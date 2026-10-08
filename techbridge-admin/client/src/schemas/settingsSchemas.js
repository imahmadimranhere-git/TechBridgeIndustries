import { z } from 'zod';
import { HEX_COLOR } from '../utils/color.js';
import { percentString, requiredText, text } from './fields.js';

export const DOCUMENT_TYPES = [
  { key: 'Invoice', label: 'Invoice' },
  { key: 'PaymentReceipt', label: 'Payment receipt' },
  { key: 'ClientStatement', label: 'Client statement' },
  { key: 'WelcomeLetter', label: 'Welcome letter' },
  { key: 'ProjectCompletion', label: 'Project completion certificate' },
  { key: 'PayoutSlip', label: 'Commission payout slip' },
  { key: 'CommissionStatement', label: 'Commission statement' },
  { key: 'FinancialReport', label: 'Financial report' },
];

export const LETTER_PLACEHOLDERS = ['{client_name}', '{client_company}', '{date}', '{company_name}', '{contact_person}', '{team}', '{deal_title}', '{deal_amount}'];

export const COMPLETION_PLACEHOLDERS = [
  '{client_name}',
  '{client_company}',
  '{company_name}',
  '{team}',
  '{deal_title}',
  '{deal_amount}',
  '{start_date}',
  '{completion_date}',
  '{duration}',
];

const hex = (label) => z.string().trim().regex(HEX_COLOR, `${label} must look like #1d4ed8`);
const wholeNumber = (label, min, max) =>
  z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max, `${label} must be a whole number from ${min} to ${max}`);

// Mirrors server/src/validators/settingsValidators.js
export const settingsFormSchema = z.object({
  companyName: requiredText(120, 'Company name'),
  tagline: text(200, 'Tagline'),
  address: text(300, 'Address'),
  city: text(80, 'City'),
  country: text(80, 'Country'),
  phone: text(30, 'Phone'),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Email is invalid')]),
  website: text(200, 'Website'),

  brandPrimaryColor: hex('Primary color'),
  brandSecondaryColor: hex('Secondary color'),
  currencySymbol: requiredText(5, 'Currency symbol'),

  stampMode: z.enum(['uploaded', 'auto', 'none']),
  defaultSignatoryId: z.string(),
  // Other founders (up to two) who sign next to the main signer
  coSignatory1: z.string(),
  coSignatory2: z.string(),
  signatoryLabel: requiredText(60, 'Signatory label'),
  documentOptions: z.record(
    z.string(),
    z.object({ showSignature: z.boolean(), showCoSignature: z.boolean(), showStamp: z.boolean(), showQr: z.boolean() })
  ),

  invoicePrefix: z.string().trim().regex(/^[A-Za-z0-9]{1,10}$/, 'Use 1-10 letters or numbers'),
  nextInvoiceNumber: wholeNumber('Next number', 1, 9999999),
  defaultTaxPercent: percentString('Default tax'),
  defaultDueDays: wholeNumber('Due days', 0, 365),
  invoiceTerms: text(3000, 'Terms'),
  footerText: text(200, 'Footer text'),

  bankDetails: z.object({
    bankName: text(100, 'Bank name'),
    accountTitle: text(100, 'Account title'),
    accountNumber: text(50, 'Account number'),
    iban: text(50, 'IBAN'),
    branch: text(100, 'Branch'),
    swiftCode: text(20, 'SWIFT code'),
  }),

  welcomeLetterTemplate: requiredText(10000, 'Welcome letter template'),
  servicesText: text(5000, 'Services'),

  // Empty = the built-in thank-you text is used
  completionLetterTemplate: text(10000, 'Completion letter template'),
});

/** API response -> form values */
export function settingsToForm({ settings, nextInvoiceNumber }) {
  // New list, or the older single "second signatory" setting
  const coSignatoryIds = settings.coSignatoryIds?.length ? settings.coSignatoryIds : [settings.coSignatoryId].filter(Boolean);

  const documentOptions = Object.fromEntries(
    DOCUMENT_TYPES.map(({ key }) => [
      key,
      { showSignature: true, showCoSignature: true, showStamp: true, showQr: true, ...(settings.documentOptions?.[key] ?? {}) },
    ])
  );
  return {
    companyName: settings.companyName ?? '',
    tagline: settings.tagline ?? '',
    address: settings.address ?? '',
    city: settings.city ?? '',
    country: settings.country ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    website: settings.website ?? '',
    brandPrimaryColor: settings.brandPrimaryColor ?? '#1d4ed8',
    brandSecondaryColor: settings.brandSecondaryColor ?? '#0f172a',
    currencySymbol: settings.currencySymbol ?? 'Rs',
    stampMode: settings.stampMode ?? 'auto',
    defaultSignatoryId: settings.defaultSignatoryId ?? '',
    coSignatory1: coSignatoryIds[0] ?? '',
    coSignatory2: coSignatoryIds[1] ?? '',
    signatoryLabel: settings.signatoryLabel ?? 'Authorized Signatory',
    documentOptions,
    invoicePrefix: settings.invoicePrefix ?? 'TBI',
    nextInvoiceNumber: String(nextInvoiceNumber ?? 1),
    defaultTaxPercent: String(settings.defaultTaxPercent ?? 0),
    defaultDueDays: String(settings.defaultDueDays ?? 15),
    invoiceTerms: settings.invoiceTerms ?? '',
    footerText: settings.footerText ?? '',
    bankDetails: {
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      iban: '',
      branch: '',
      swiftCode: '',
      ...(settings.bankDetails ?? {}),
    },
    welcomeLetterTemplate: settings.welcomeLetterTemplate ?? '',
    servicesText: (settings.servicesList ?? []).join('\n'),
    completionLetterTemplate: settings.completionLetterTemplate ?? '',
  };
}

/** Only the keys of one tab, converted to what the API expects */
export function settingsPatch(values, keys, currentNextNumber) {
  const patch = {};
  for (const key of keys) {
    if (key === 'servicesText') {
      patch.servicesList = values.servicesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    } else if (key === 'nextInvoiceNumber') {
      // Only sent when changed: the server refuses numbers that were already used
      if (Number(values.nextInvoiceNumber) !== Number(currentNextNumber)) patch.nextInvoiceNumber = Number(values.nextInvoiceNumber);
    } else if (key === 'defaultTaxPercent' || key === 'defaultDueDays') {
      patch[key] = Number(values[key] || 0);
    } else if (key === 'defaultSignatoryId') {
      patch.defaultSignatoryId = values.defaultSignatoryId || null;
    } else if (key === 'coSignatory1') {
      // Both dropdowns become one list; the old single setting is cleared
      patch.coSignatoryIds = [...new Set([values.coSignatory1, values.coSignatory2].filter(Boolean))];
      patch.coSignatoryId = null;
    } else if (key === 'coSignatory2') {
      // Saved together with coSignatory1
    } else if (key === 'invoicePrefix') {
      patch.invoicePrefix = values.invoicePrefix.toUpperCase();
    } else {
      patch[key] = values[key];
    }
  }
  return patch;
}
