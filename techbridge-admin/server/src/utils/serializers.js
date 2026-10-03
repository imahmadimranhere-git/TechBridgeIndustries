import { toUploadUrl } from './uploadUrl.js';

// The only user fields the browser ever sees (never the password hash)
export function serializeUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    designation: user.designation,
    phone: user.phone,
    email: user.email,
    isActive: user.isActive,
    signatureUrl: toUploadUrl(user.signaturePath),
    stampUrl: toUploadUrl(user.stampPath),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}