import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { baseSchemaOptions, emailField, textField } from './schemaHelpers.js';

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: textField(100, { required: true, label: 'Name' }),
    designation: textField(100),
    phone: textField(30),
    email: { ...emailField({ required: true }), unique: true },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    signaturePath: { type: String, default: null },
    stampPath: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  {
    ...baseSchemaOptions,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash the password whenever it is set or changed
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

// Requires the document to be loaded with .select('+password')
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// True if the password changed after the JWT was issued (token must be rejected)
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtIssuedAtSeconds) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > jwtIssuedAtSeconds;
};

export default mongoose.model('User', userSchema);