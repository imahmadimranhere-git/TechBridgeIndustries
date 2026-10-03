import mongoose from 'mongoose';
import softDeletePlugin from '../utils/softDelete.js';
import { baseSchemaOptions, commissionFields, emailField, textField } from './schemaHelpers.js';
import { STAFF_STATUSES } from '../config/constants.js';

const CNIC_REGEX = /^\d{5}-\d{7}-\d$/;

const staffSchema = new mongoose.Schema(
  {
    name: textField(120, { required: true, label: 'Staff name' }),
    email: emailField(),
    phone: textField(30),
    cnic: {
      ...textField(15),
      validate: {
        validator: (value) => !value || CNIC_REGEX.test(value),
        message: 'CNIC must look like 12345-1234567-1',
      },
    },
    address: textField(300),
    joiningDate: { type: Date, default: Date.now },
    // Defaults copied onto each new deal
    ...commissionFields(),
    status: { type: String, enum: STAFF_STATUSES, default: 'Active', index: true },
  },
  baseSchemaOptions
);

staffSchema.index({ name: 'text', email: 'text', phone: 'text' }, { name: 'staff_text_search' });

staffSchema.virtual('deals', { ref: 'Deal', localField: '_id', foreignField: 'assignedStaff' });

staffSchema.plugin(softDeletePlugin);

export default mongoose.model('Staff', staffSchema);