import mongoose from 'mongoose';
import { baseSchemaOptions, textField } from './schemaHelpers.js';
import { NOTABLE_TYPES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

// One notes collection for clients, staff and deals (polymorphic)
const noteSchema = new mongoose.Schema(
  {
    notableType: { type: String, enum: NOTABLE_TYPES, required: true },
    notableId: { type: ObjectId, required: true, refPath: 'notableType' },
    title: textField(150, { required: true, label: 'Title' }),
    body: textField(10000),
    date: { type: Date, default: Date.now },
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions
);

noteSchema.index({ notableType: 1, notableId: 1, date: -1 });
noteSchema.index({ date: -1 });

export default mongoose.model('Note', noteSchema);