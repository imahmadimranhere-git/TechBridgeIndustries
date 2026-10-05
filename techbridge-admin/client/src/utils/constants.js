// Mirrors server/src/config/constants.js
export const CLIENT_SOURCES = ['Referral', 'Facebook', 'Instagram', 'LinkedIn', 'Google', 'Website', 'Fiverr', 'Upwork', 'Other'];
export const CLIENT_STATUSES = ['Lead', 'Active', 'Inactive'];
export const STAFF_STATUSES = ['Active', 'Inactive'];
export const DEAL_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
export const INVOICE_STATUSES = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'];
export const PAYMENT_METHODS = ['Cash', 'Bank', 'JazzCash', 'EasyPaisa', 'Other'];
export const COMMISSION_TYPES = ['percentage', 'fixed'];

/** ['A', 'B'] -> [{ value: 'A', label: 'A' }, ...] for <Select> */
export const toOptions = (values) => values.map((value) => ({ value, label: value }));