import { z } from 'zod';
import { NOTABLE_TYPES } from '../config/constants.js';
import {
  objectId,
  optionalDateInput,
  optionalEnum,
  optionalId,
  optionalText,
  paginationQuery,
  requiredText,
} from './common.js';

export const noteCreateSchema = z.object({
  notableType: z.enum(NOTABLE_TYPES),
  notableId: objectId('Record'),
  title: requiredText(150, 'Title'),
  body: optionalText(10000, 'Note'),
  date: optionalDateInput('Date'),
});

export const noteUpdateSchema = z.object({
  title: requiredText(150, 'Title'),
  body: optionalText(10000, 'Note'),
  date: optionalDateInput('Date'),
});

export const noteListQuery = paginationQuery.extend({
  notableType: optionalEnum(NOTABLE_TYPES),
  notableId: optionalId('Record'),
});