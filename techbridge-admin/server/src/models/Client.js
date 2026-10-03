import mongoose from 'mongoose';
import softDeletePlugin from '../utils/softDelete.js';
import { baseSchemaOptions, emailField, textField } from './schemaHelpers.js';
import { CLIENT_SOURCES, CLIENT_STATUSES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const clientSchema = new mongoose.Schema(
  {
    name: textField(120, { required: true, label: 'Client name' }),
    companyName: textField(150),
    email: emailField(),
    phone: textField(30),
    whatsapp: textField(30),
    address: textField(300),
    city: textField(80),
    country: { ...textField(80), default: 'Pakistan' },
    website: textField(200),
    source: { type: String, enum: CLIENT_SOURCES, default: 'Other' },
    status: { type: String, enum: CLIENT_STATUSES, default: 'Active', index: true },
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions
);

clientSchema.index(
  { name: 'text', companyName: 'text', email: 'text', phone: 'text' },
  { name: 'client_text_search', weights: { name: 10, companyName: 8, email: 5, phone: 5 } }
);
clientSchema.index({ createdAt: -1 });

// client.populate('deals') -> all deals of this client
clientSchema.virtual('deals', { ref: 'Deal', localField: '_id', foreignField: 'client' });

clientSchema.plugin(softDeletePlugin);

export default mongoose.model('Client', clientSchema);