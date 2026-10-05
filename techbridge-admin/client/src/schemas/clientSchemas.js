import { z } from 'zod';
import { CLIENT_SOURCES, CLIENT_STATUSES } from '../utils/constants.js';

const text = (max, label) => z.string().trim().max(max, `${label} cannot be longer than ${max} characters`);

// Mirrors server/src/validators/clientValidators.js
export const clientSchema = z.object({
  name: text(120, 'Client name').min(1, 'Client name is required'),
  companyName: text(150, 'Company name'),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Email is invalid')]),
  phone: text(30, 'Phone'),
  whatsapp: text(30, 'WhatsApp'),
  address: text(300, 'Address'),
  city: text(80, 'City'),
  country: text(80, 'Country'),
  website: text(200, 'Website'),
  source: z.enum(CLIENT_SOURCES),
  status: z.enum(CLIENT_STATUSES),
});

export const emptyClient = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  country: 'Pakistan',
  website: '',
  source: 'Other',
  status: 'Active',
};