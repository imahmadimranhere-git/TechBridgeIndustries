// One colour per status everywhere in the app (badges, tables, profiles)
const STATUS_TONES = {
  // Invoices
  Draft: 'neutral',
  Sent: 'info',
  'Partially Paid': 'warning',
  Paid: 'success',
  Overdue: 'danger',
  // Deals
  Pending: 'neutral',
  'In Progress': 'info',
  Completed: 'success',
  Cancelled: 'danger',
  // Clients and staff
  Lead: 'purple',
  Active: 'success',
  Inactive: 'neutral',
  // Logs
  Success: 'success',
  Failed: 'danger',
  Received: 'success',
};

export const statusTone = (status) => STATUS_TONES[status] ?? 'neutral';