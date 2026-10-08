import { DOCUMENT_TYPES } from './constants.js';

const ALL_ON = { showSignature: true, showCoSignature: true, showStamp: true, showQr: true };

// Placeholders are replaced when the PDF is generated
export const DEFAULT_WELCOME_LETTER = `Dear {client_name},

Thank you for choosing {company_name}. We are delighted to welcome {client_company} as our client and look forward to a long and successful partnership.

As of {date}, we are pleased to confirm the start of our work together on {deal_title}, with an agreed value of {deal_amount}. Our team will keep you informed at every stage. For anything you need, you can reach our founders: {team}.

Below you will find an overview of our services and our bank details for payments. If you have any questions, simply reply to this letter or give us a call; we are always happy to help.

We look forward to building something great together.`;

// Thank-you text printed on the Project Completion Certificate (sent after delivery)
export const DEFAULT_COMPLETION_LETTER = `Dear {client_name},

It is with great pleasure that we confirm the successful completion and delivery of {deal_title} on {completion_date}. On behalf of everyone at {company_name}, thank you for the trust you placed in us and for being such a wonderful partner throughout this journey.

Working with {client_company} has been a true privilege. Your ideas, feedback and patience helped shape the final result, and we are proud of what we have built together.

Our relationship does not end at delivery. Whenever you need support, updates or new features, we are only one message away. You can reach our founders directly: {team}.

We would be honoured to work with you again on your next idea. If you are happy with our work, we would be grateful if you could share your experience or recommend us to others.

With sincere thanks and best wishes for your continued success.`;

export const DEFAULT_SERVICES = [
  'Custom Web Development',
  'Mobile App Development (Android & iOS)',
  'UI/UX Design',
  'E-commerce Solutions',
  'SEO & Digital Marketing',
  'Cloud Hosting & DevOps',
  'Maintenance & Support',
];

/**
 * Every setting the app knows about, with its default value.
 * The seeder only inserts keys that don't exist yet, so admin changes are never overwritten.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  // Company profile
  companyName: 'TechBridgeIndustries',
  tagline: 'Building digital bridges for growing businesses',
  address: '',
  city: '',
  country: 'Pakistan',
  phone: '',
  email: '',
  website: '',

  // Branding
  logoPath: null,
  brandPrimaryColor: '#1d4ed8',
  brandSecondaryColor: '#0f172a',
  currencySymbol: 'Rs',

  // Stamp & signatory
  stampMode: 'auto', // 'uploaded' | 'auto' | 'none'
  stampPath: null,
  defaultSignatoryId: null,
  // Other founders who sign next to the main signer and appear as contacts (max 2)
  coSignatoryIds: [],
  coSignatoryId: null, // older single-value setting, still read for compatibility
  signatoryLabel: 'Authorized Signatory',
  documentOptions: Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, { ...ALL_ON }])),

  // Invoicing
  invoicePrefix: 'TBI',
  defaultTaxPercent: 0,
  defaultDueDays: 15,
  invoiceTerms:
    'Payment is due within 15 days of the invoice date. Please quote the invoice number with your payment.',
  footerText: 'Thank you for your business',

  // Bank details
  bankDetails: {
    bankName: '',
    accountTitle: 'TechBridgeIndustries',
    accountNumber: '',
    iban: '',
    branch: '',
    swiftCode: '',
  },

  // Welcome letter
  welcomeLetterTemplate: DEFAULT_WELCOME_LETTER,
  servicesList: DEFAULT_SERVICES,

  // Project completion certificate
  completionLetterTemplate: DEFAULT_COMPLETION_LETTER,
});

// Safe to show on public pages (login, verify). Never add bank or internal keys here.
export const PUBLIC_SETTING_KEYS = [
  'companyName',
  'tagline',
  'logoPath',
  'brandPrimaryColor',
  'brandSecondaryColor',
  'website',
  'email',
  'phone',
  'currencySymbol',
];
