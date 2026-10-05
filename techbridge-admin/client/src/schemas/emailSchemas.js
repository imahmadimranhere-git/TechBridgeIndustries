import { z } from 'zod';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "a@x.com, b@y.com": every part must be an email; empty is allowed
const emailList = (label) =>
  z
    .string()
    .trim()
    .refine(
      (value) => !value || value.split(/[,;]/).every((part) => !part.trim() || EMAIL.test(part.trim())),
      `${label}: enter valid email addresses separated by commas`
    );

export const emailFormSchema = z.object({
  to: emailList('To'),
  cc: emailList('CC'),
  subject: z.string().trim().max(200, 'Subject is too long'),
  message: z.string().trim().max(2000, 'Message is too long'),
});