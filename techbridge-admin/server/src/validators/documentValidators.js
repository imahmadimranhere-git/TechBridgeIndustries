import { z } from 'zod';
import { dateRangeQuery, optionalId } from './common.js';

// ?download=1 -> save as file, otherwise show inline (preview)
const downloadFlag = z
  .enum(['0', '1', 'true', 'false'])
  .optional()
  .transform((value) => value === '1' || value === 'true');

export const pdfQuery = z.object({ download: downloadFlag });

export const periodPdfQuery = dateRangeQuery.extend({ download: downloadFlag });

export const welcomeLetterQuery = pdfQuery.extend({ dealId: optionalId('Deal') });