import mongoose from 'mongoose';
import softDeletePlugin from '../utils/softDelete.js';
import { baseSchemaOptions, hasMaxTwoDecimals, money, percentage, textField } from './schemaHelpers.js';
import { INVOICE_STATUS, INVOICE_STATUSES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const invoiceItemSchema = new mongoose.Schema({
  description: textField(500, { required: true, label: 'Item description' }),
  qty: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
    validate: { validator: hasMaxTwoDecimals, message: 'Quantity can have at most 2 decimal places' },
  },
  rate: money({ required: true }),
  amount: money(),
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    sequence: { type: Number, required: true, index: true },
    client: { type: ObjectId, ref: 'Client', required: [true, 'Client is required'] },
    deal: { type: ObjectId, ref: 'Deal', required: [true, 'Deal is required'] },
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator(value) {
          return !this.invoiceDate || value >= this.invoiceDate;
        },
        message: 'Due date cannot be before the invoice date',
      },
    },
    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Add at least one line item',
      },
    },
    subtotal: money(),
    discount: money(),
    taxPercent: percentage(),
    taxAmount: money(),
    total: money(),
    // Cached sum of linked payments, updated inside the payment transaction
    amountPaid: money(),
    status: { type: String, enum: INVOICE_STATUSES, default: INVOICE_STATUS.DRAFT },
    sentAt: { type: Date, default: null },
    notes: textField(2000),
    terms: textField(3000),
    signedBy: { type: ObjectId, ref: 'User', default: null },
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions
);

invoiceSchema.index({ client: 1, invoiceDate: -1 });
invoiceSchema.index({ deal: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ invoiceDate: -1 });

// Server-side totals: the browser's numbers are only a preview
invoiceSchema.methods.recalculateTotals = function recalculateTotals() {
  let subtotal = 0;
  for (const item of this.items) {
    item.amount = Math.round(item.qty * item.rate);
    subtotal += item.amount;
  }
  this.subtotal = subtotal;
  this.discount = Math.min(this.discount || 0, subtotal);
  const taxable = subtotal - this.discount;
  this.taxAmount = Math.round((taxable * (this.taxPercent || 0)) / 100);
  this.total = taxable + this.taxAmount;
};

invoiceSchema.pre('validate', function runTotals() {
  this.recalculateTotals();
});

invoiceSchema.virtual('balanceDue').get(function balanceDue() {
  return Math.max((this.total || 0) - (this.amountPaid || 0), 0);
});

// Status the invoice should have, based on payments and due date
invoiceSchema.methods.deriveStatus = function deriveStatus(now = new Date()) {
  const balance = (this.total || 0) - (this.amountPaid || 0);
  if (this.total > 0 && balance <= 0) return INVOICE_STATUS.PAID;
  if (this.status === INVOICE_STATUS.DRAFT && !this.amountPaid) return INVOICE_STATUS.DRAFT;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (this.dueDate && this.dueDate < startOfToday) return INVOICE_STATUS.OVERDUE;

  return this.amountPaid > 0 ? INVOICE_STATUS.PARTIALLY_PAID : INVOICE_STATUS.SENT;
};

invoiceSchema.plugin(softDeletePlugin);

export default mongoose.model('Invoice', invoiceSchema);