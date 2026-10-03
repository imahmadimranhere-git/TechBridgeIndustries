import mongoose from 'mongoose';
import softDeletePlugin from '../utils/softDelete.js';
import { computeCommissionTotal } from '../utils/commission.js';
import { baseSchemaOptions, commissionFields, money, textField } from './schemaHelpers.js';
import { DEAL_STATUS, DEAL_STATUSES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const dealSchema = new mongoose.Schema(
  {
    client: { type: ObjectId, ref: 'Client', required: [true, 'Client is required'] },
    title: textField(150, { required: true, label: 'Deal title' }),
    description: textField(5000),
    dealAmount: money({ required: true }),
    startDate: { type: Date, default: Date.now, index: true },
    deadline: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          return !value || !this.startDate || value >= this.startDate;
        },
        message: 'Deadline cannot be before the start date',
      },
    },
    assignedStaff: { type: ObjectId, ref: 'Staff', default: null },
    // Copied from the staff member at creation so later rate changes don't affect old deals
    ...commissionFields(),
    commissionTotal: money(),
    status: { type: String, enum: DEAL_STATUSES, default: DEAL_STATUS.PENDING, index: true },
    completedAt: { type: Date, default: null },
    notes: textField(2000),
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions
);

dealSchema.index({ client: 1, status: 1 });
dealSchema.index({ assignedStaff: 1, status: 1 });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ title: 'text', description: 'text' }, { name: 'deal_text_search' });

// Server always recalculates commission; never trust a value sent by the browser
dealSchema.pre('validate', function calculateDealFields() {
  this.commissionTotal = this.assignedStaff ? computeCommissionTotal(this) : 0;

  if (this.isModified('status')) {
    this.completedAt =
      this.status === DEAL_STATUS.COMPLETED ? this.completedAt || new Date() : null;
  }
});

dealSchema.virtual('payments', { ref: 'Payment', localField: '_id', foreignField: 'deal' });
dealSchema.virtual('invoices', { ref: 'Invoice', localField: '_id', foreignField: 'deal' });

dealSchema.plugin(softDeletePlugin);

export default mongoose.model('Deal', dealSchema);