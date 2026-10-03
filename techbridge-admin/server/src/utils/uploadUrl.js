import env from '../config/env.js';

// "signatures/abc.png" -> "http://localhost:5000/uploads/signatures/abc.png"
export function toUploadUrl(relativePath) {
  if (!relativePath) return null;
  const safePath = relativePath.split('/').map(encodeURIComponent).join('/');
  return `${env.SERVER_URL}/uploads/${safePath}`;
}