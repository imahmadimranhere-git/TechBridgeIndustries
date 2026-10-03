import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute folder paths used across the server
export const SERVER_ROOT = path.resolve(__dirname, '../..');
export const SRC_ROOT = path.join(SERVER_ROOT, 'src');
export const UPLOAD_ROOT = path.join(SERVER_ROOT, 'uploads');
export const TEMPLATE_ROOT = path.join(SRC_ROOT, 'templates');

export const UPLOAD_FOLDERS = Object.freeze({
  BRANDING: 'branding',
  SIGNATURES: 'signatures',
  STAMPS: 'stamps',
});