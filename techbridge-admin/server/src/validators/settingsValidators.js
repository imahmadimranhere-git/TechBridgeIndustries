import { z } from 'zod';
import { DOCUMENT_TYPES, STAMP_MODES } from '../config/constants.js';
import { nullableObjectId, objectId, optionalEmail, optionalText, percentInput, requiredText } from './common.js';

const hexColor = (label) =>
  z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, `${label} must be a hex color like #1d4ed8`);

const documentOption = z
  .object({ showSignature: z.boolean(), showCoSignature: z.boolean(), showStamp: z.boolean(), showQr: z.boolean() })
  .partial();

// Every key is optional: the Settings page can save one section at a time
export const settingsUpdateSchema = z
  .object({
    // Company profile
    companyName: requiredText(120, 'Company name'),
    tagline: optionalText(200, 'Tagline'),
    address: optionalText(300, 'Address'),
    city: optionalText(80, 'City'),
    country: optionalText(80, 'Country'),
    phone: optionalText(30, 'Phone'),
    email: optionalEmail,
    website: optionalText(200, 'Website'),

    // Branding
    brandPrimaryColor: hexColor('Primary color'),
    brandSecondaryColor: hexColor('Secondary color'),
    currencySymbol: requiredText(5, 'Currency symbol'),

    // Stamp & signatory
    stampMode: z.enum(STAMP_MODES),
    defaultSignatoryId: nullableObjectId('Signatory'),
    coSignatoryIds: z.array(objectId('Signatory')).max(2, 'Choose at most 2 other signatories'),
    coSignatoryId: nullableObjectId('Second signatory'),
    signatoryLabel: requiredText(60, 'Signatory label'),
    documentOptions: z
      .object(Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, documentOption])))
      .partial(),

    // Invoicing
    invoicePrefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{1,10}$/, 'Invoice prefix must be 1-10 letters or numbers'),
    nextInvoiceNumber: z.coerce.number().int('Must be a whole number').min(1).max(9999999),
    defaultTaxPercent: percentInput('Default tax'),
    defaultDueDays: z.coerce.number().int().min(0, 'Cannot be negative').max(365, 'At most 365 days'),
    invoiceTerms: optionalText(3000, 'Terms'),
    footerText: optionalText(200, 'Footer text'),

    // Bank details
    bankDetails: z.object({
      bankName: optionalText(100, 'Bank name'),
      accountTitle: optionalText(100, 'Account title'),
      accountNumber: optionalText(50, 'Account number'),
      iban: optionalText(50, 'IBAN'),
      branch: optionalText(100, 'Branch'),
      swiftCode: optionalText(20, 'SWIFT code'),
    }),

    // Welcome letter
    welcomeLetterTemplate: requiredText(10000, 'Welcome letter template'),
    servicesList: z.array(requiredText(150, 'Service')).max(30, 'Add at most 30 services'),

    // Project completion certificate (empty = use the built-in text)
    completionLetterTemplate: optionalText(10000, 'Completion letter template'),
  })
  .partial();
