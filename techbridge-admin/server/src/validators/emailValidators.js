import { z } from 'zod';
import { dateRangeQuery, emailField, optionalId, optionalText } from './common.js';

// "a@x.com, b@y.com" or ["a@x.com", "b@y.com"] -> ["a@x.com", "b@y.com"]
const emailList = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const list = Array.isArray(value) ? value : String(value).split(/[,;]/);
    const cleaned = list.map((email) => String(email).trim().toLowerCase()).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  },
  z.array(z.string().email('Enter valid email addresses')).max(5, 'Send to at most 5 addresses').optional()
);

export const emailSendSchema = z.object({
  to: emailList,
  cc: emailList,
  subject: optionalText(200, 'Subject'),
  message: optionalText(2000, 'Message'),
});

export const periodEmailSchema = emailSendSchema.extend(dateRangeQuery.shape);

export const welcomeEmailSchema = emailSendSchema.extend({ dealId: optionalId('Deal') });

export const testEmailSchema = z.object({ to: emailField });