import mongoose from 'mongoose';
import { baseSchemaOptions, money, textField } from './schemaHelpers.js';
import { PAYMENT_METHODS } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const paymentSchema = new mongoose.Schema(
  {
    client: { type: ObjectId, ref: 'Client', required: [true, 'Client is required'], index: true },
    deal: { type: ObjectId, ref: 'Deal', required: [true, 'Deal is required'] },
    // Optional: advance payments may have no invoice
    invoice: { type: ObjectId, ref: 'Invoice', default: null, index: true },
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

paymentSchema.index({ deal: 1, date: -1 });

export default mongoose.model('Payment', paymentSchema);