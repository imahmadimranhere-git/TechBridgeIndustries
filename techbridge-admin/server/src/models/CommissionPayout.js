import mongoose from 'mongoose';
import { baseSchemaOptions, money, textField } from './schemaHelpers.js';
import { PAYMENT_METHODS } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

// Money paid OUT to a staff member against their earned commission
const commissionPayoutSchema = new mongoose.Schema(
  {
    staff: { type: ObjectId, ref: 'Staff', required: [true, 'Staff member is required'] },
    amount: money({ required: true, min: 1 }),
    date: { type: Date, required: true, default: Date.now, index: true },
    method: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    reference: textField(120),
    note: textField(1000),
    signedBy: { type: ObjectId, ref: 'User', default: null },
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions
);

commissionPayoutSchema.index({ staff: 1, date: -1 });

export default mongoose.model('CommissionPayout', commissionPayoutSchema);