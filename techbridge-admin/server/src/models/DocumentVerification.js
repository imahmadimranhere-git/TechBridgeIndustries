import mongoose from 'mongoose';
import { money, textField } from './schemaHelpers.js';
import { DOCUMENT_TYPES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

// Minimal public facts captured when the PDF was issued (no commission, no notes)
const snapshotSchema = new mongoose.Schema(
  {
    documentNumber: textField(60),
    partyName: textField(150),
    amount: money(),
    documentDate: { type: Date, default: null },
    status: textField(40),
    periodFrom: { type: Date, default: null },
    periodTo: { type: Date, default: null },
  },
  { _id: false }
);

const documentVerificationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    documentId: { type: ObjectId, required: true },
    snapshot: { type: snapshotSchema, default: () => ({}) },
    issuedAt: { type: Date, default: Date.now },
    signedBy: { type: ObjectId, ref: 'User', default: null },
    issuedBy: { type: ObjectId, ref: 'User', default: null },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

documentVerificationSchema.index({ documentType: 1, documentId: 1 });

export default mongoose.model('DocumentVerification', documentVerificationSchema);