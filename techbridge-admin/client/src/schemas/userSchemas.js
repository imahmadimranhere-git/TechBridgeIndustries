import { z } from 'zod';
import { requiredText, text } from './fields.js';

// Mirrors server/src/validators/userValidators.js
const strongPassword = (label) =>
  z
    .string()
    .min(8, `${label} must be at least 8 characters`)
    .max(100, `${label} is too long`)
    .regex(/[A-Za-z]/, `${label} must contain at least one letter`)
    .regex(/\d/, `${label} must contain at least one number`);

const userFields = {
  name: requiredText(100, 'Name'),
  designation: text(100, 'Designation'),
  phone: text(30, 'Phone'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
};

export const userCreateSchema = z.object({ ...userFields, password: strongPassword('Password') });

// Empty password = keep the current one
export const userUpdateSchema = z.object({
  ...userFields,
  isActive: z.boolean(),
  password: z.union([z.literal(''), strongPassword('New password')]),
});

export const profileSchema = z.object(userFields);

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPassword('New password'),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
    if (data.currentPassword && data.newPassword === data.currentPassword) {
      ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'New password must be different' });
    }
  });