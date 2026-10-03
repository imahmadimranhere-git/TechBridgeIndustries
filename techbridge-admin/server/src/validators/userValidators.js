import { z } from 'zod';
import { emailField, optionalText, paginationQuery, requiredText } from './common.js';

const strongPassword = (label = 'Password') =>
  z
    .string({ message: `${label} is required` })
    .min(8, `${label} must be at least 8 characters`)
    .max(100, `${label} is too long`)
    .regex(/[A-Za-z]/, `${label} must contain at least one letter`)
    .regex(/\d/, `${label} must contain at least one number`);

const userFields = {
  name: requiredText(100, 'Name'),
  designation: optionalText(100, 'Designation'),
  phone: optionalText(30, 'Phone'),
  email: emailField,
};

export const createUserSchema = z.object({
  ...userFields,
  password: strongPassword(),
});

// Leave password empty to keep the current one
export const updateUserSchema = z.object({
  ...userFields,
  isActive: z.boolean().default(true),
  password: z.preprocess((value) => (value === '' ? undefined : value), strongPassword('New password').optional()),
});

export const profileUpdateSchema = z.object(userFields);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPassword('New password'),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'New password must be different' });
    }
  });

export const userListQuery = paginationQuery;