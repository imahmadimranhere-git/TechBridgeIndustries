import { COMMISSION_TYPE, COMMISSION_TYPES } from '../config/constants.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared options for every schema: createdAt/updatedAt and virtuals in JSON output
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
};

// True when a number has at most two decimal places (12.5, 7.25 OK; 3.333 not OK)
export const hasMaxTwoDecimals = (value) =>
  value == null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const wholeNumber = {
  validator: (value) => value == null || Number.isInteger(value),
  message: '{PATH} must be a whole number in minor units (paisa)',
};

// Money is always stored as an integer number of paisa/cents
export const money = ({ required = false, min = 0 } = {}) => ({
  type: Number,
  min: [min, `{PATH} cannot be less than ${min}`],
  validate: wholeNumber,
  ...(required ? { required: [true, '{PATH} is required'] } : { default: 0 }),
});

export const percentage = ({ required = false, defaultValue = 0 } = {}) => ({
  type: Number,
  min: [0, '{PATH} cannot be negative'],
  max: [100, '{PATH} cannot be more than 100'],
  validate: { validator: hasMaxTwoDecimals, message: '{PATH} can have at most 2 decimal places' },
  ...(required ? { required: [true, '{PATH} is required'] } : { default: defaultValue }),
});

export const emailField = ({ required = false } = {}) => ({
  type: String,
  trim: true,
  lowercase: true,
  maxlength: 150,
  ...(required ? { required: [true, 'Email is required'] } : { default: '' }),
  validate: { validator: (value) => !value || EMAIL_REGEX.test(value), message: 'Email is invalid' },
});

export const textField = (maxlength = 200, { required = false, label = 'This field' } = {}) => ({
  type: String,
  trim: true,
  maxlength: [maxlength, `${label} cannot be longer than ${maxlength} characters`],
  ...(required ? { required: [true, `${label} is required`] } : { default: '' }),
});

/**
 * percentage -> rate is 0..100 with up to 2 decimals (e.g. 12.5 means 12.5%)
 * fixed      -> rate is a whole amount in paisa (e.g. 1500000 means Rs 15,000)
 */
export function isValidCommissionRate(type, value) {
  if (value == null || value < 0) return false;
  if (type === COMMISSION_TYPE.FIXED) return Number.isInteger(value);
  return value <= 100 && hasMaxTwoDecimals(value);
}

// Commission fields shared by Staff (defaults) and Deal (copied at creation)
export const commissionFields = () => ({
  commissionType: {
    type: String,
    enum: COMMISSION_TYPES,
    default: COMMISSION_TYPE.PERCENTAGE,
  },
  commissionRate: {
    type: Number,
    default: 0,
    validate: {
      validator(value) {
        return isValidCommissionRate(this.commissionType, value);
      },
      message:
        'Invalid commission rate: use 0-100 (max 2 decimals) for percentage, or a whole amount in paisa for fixed',
    },
  },
});