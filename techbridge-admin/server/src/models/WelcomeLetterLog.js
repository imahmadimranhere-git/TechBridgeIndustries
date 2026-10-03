import mongoose from 'mongoose';
import { baseSchemaOptions, emailField, textField } from './schemaHelpers.js';
import { WELCOME_LETTER_ACTIONS } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

// History of every welcome letter downloaded or emailed
const welcomeLetterLogSchema = new mongoose.Schema(
  {
    client: { type: ObjectId, ref: 'Client', required: true },
    deal: { type: ObjectId, ref: 'Deal', default: null },
    action: { type: String, enum: WELCOME_LETTER_ACTIONS, required: true },
    sentTo: emailField(),
    subject: textField(200),
    verificationCode: { type: String, default: null },
    status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    errorMessage: textField(1000),
    signedBy: { type: ObjectId, ref: 'User', default: null },
    sentBy: { type: ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions
);

welcomeLetterLogSchema.index({ client: 1, createdAt: -1 });

export default mongoose.model('WelcomeLetterLog', welcomeLetterLogSchema);