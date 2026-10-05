import api from './client.js';
import { cleanParams } from './crud.js';

// 'attachment; filename="Invoice-TBI-0001.pdf"' -> 'Invoice-TBI-0001.pdf'
function fileNameFrom(header) {
  const match = /filename="?([^"]+)"?/i.exec(header ?? '');
  return match ? match[1] : null;
}

/** Downloads a PDF route as a Blob: { blob, filename, verificationCode } */
export async function fetchPdf(path, params = {}) {
  const response = await api.get(path, { params: cleanParams(params), responseType: 'blob' });
  return {
    blob: response.data,
    filename: fileNameFrom(response.headers['content-disposition']) ?? 'document.pdf',
    verificationCode: response.headers['x-verification-code'] ?? null,
  };
}

/** POSTs to an email route (e.g. /invoices/:id/email) */
export function sendDocumentEmail(path, body) {
  return api.post(path, body).then((response) => response.data);
}