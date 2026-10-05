import { z } from 'zod';

export const noteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150, 'Title is too long'),
  body: z.string().trim().max(10000, 'Note is too long'),
  date: z.string().min(1, 'Date is required'),
});