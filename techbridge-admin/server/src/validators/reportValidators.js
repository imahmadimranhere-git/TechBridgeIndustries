import { z } from 'zod';
import { dateRangeQuery } from './common.js';

export const REPORT_TYPES = ['summary', 'clients', 'deals', 'staff'];

export const reportQuery = dateRangeQuery;

export const reportExportQuery = dateRangeQuery.extend({
  type: z.enum(REPORT_TYPES).default('summary'),
});