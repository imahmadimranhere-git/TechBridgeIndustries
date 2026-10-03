// Single source of truth for enum values used by models, validators and services

export const CLIENT_STATUSES = ['Lead', 'Active', 'Inactive'];

export const CLIENT_SOURCES = [
  'Referral',
  'Facebook',
  'Instagram',
  'LinkedIn',
  'Google',
  'Website',
  'Fiverr',
  'Upwork',
  'Other',
];

export const STAFF_STATUSES = ['Active', 'Inactive'];

export const COMMISSION_TYPE = Object.freeze({
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
});
export const COMMISSION_TYPES = Object.values(COMMISSION_TYPE);

export const DEAL_STATUS = Object.freeze({
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
});
export const DEAL_STATUSES = Object.values(DEAL_STATUS);

export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
});
export const INVOICE_STATUSES = Object.values(INVOICE_STATUS);

export const PAYMENT_METHODS = ['Cash', 'Bank', 'JazzCash', 'EasyPaisa', 'Other'];

export const NOTABLE_TYPES = ['Client', 'Staff', 'Deal'];

export const DOCUMENT_TYPE = Object.freeze({
  INVOICE: 'Invoice',
  PAYMENT_RECEIPT: 'PaymentReceipt',
  CLIENT_STATEMENT: 'ClientStatement',
  PAYOUT_SLIP: 'PayoutSlip',
  COMMISSION_STATEMENT: 'CommissionStatement',
  WELCOME_LETTER: 'WelcomeLetter',
  FINANCIAL_REPORT: 'FinancialReport',
});
export const DOCUMENT_TYPES = Object.values(DOCUMENT_TYPE);

// Used in verification codes, e.g. TBI-INV-0001-8F3K
export const DOCUMENT_CODE_PREFIX = Object.freeze({
  [DOCUMENT_TYPE.INVOICE]: 'INV',
  [DOCUMENT_TYPE.PAYMENT_RECEIPT]: 'RCP',
  [DOCUMENT_TYPE.CLIENT_STATEMENT]: 'STM',
  [DOCUMENT_TYPE.PAYOUT_SLIP]: 'PAY',
  [DOCUMENT_TYPE.COMMISSION_STATEMENT]: 'CST',
  [DOCUMENT_TYPE.WELCOME_LETTER]: 'WEL',
  [DOCUMENT_TYPE.FINANCIAL_REPORT]: 'RPT',
});

export const WELCOME_LETTER_ACTIONS = ['Downloaded', 'Emailed'];

export const STAMP_MODES = ['uploaded', 'auto', 'none'];