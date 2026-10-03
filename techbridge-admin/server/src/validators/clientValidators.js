import { z } from 'zod';
import { CLIENT_SOURCES, CLIENT_STATUSES } from '../config/constants.js';
import { optionalEmail, optionalEnum, optionalText, paginationQuery, requiredText } from './common.js';

export const clientBodySchema = z.object({
  name: requiredText(120, 'Client name'),
  companyName: optionalText(150, 'Company name'),
  email: optionalEmail,
  phone: optionalText(30, 'Phone'),
  whatsapp: optionalText(30, 'WhatsApp'),
  address: optionalText(300, 'Address'),
  city: optionalText(80, 'City'),
  country: optionalText(80, 'Country'),
  website: optionalText(200, 'Website'),
  source: z.enum(CLIENT_SOURCES).default('Other'),
  status: z.enum(CLIENT_STATUSES).default('Active'),
});

export const clientListQuery = paginationQuery.extend({
  status: optionalEnum(CLIENT_STATUSES),
  source: optionalEnum(CLIENT_SOURCES),
  sort: z.enum(['newest', 'oldest', 'name', 'remaining']).default('newest'),
});