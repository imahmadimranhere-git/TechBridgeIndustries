import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const ISSUER = 'techbridge-admin';
const ALGORITHM = 'HS256';

export function signAuthToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: ISSUER,
    algorithm: ALGORITHM,
  });
}

// Throws TokenExpiredError / JsonWebTokenError when invalid
export function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER, algorithms: [ALGORITHM] });
}

/**
 * httpOnly: JavaScript in the browser can't read it (protects against XSS token theft)
 * secure:   only sent over HTTPS in production
 * sameSite: 'lax' works when the API and the React app are on the same site
 *           (e.g. admin.example.com + api.example.com, or localhost in development)
 */
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie(env.COOKIE_NAME, token, { ...authCookieOptions(), maxAge: exp * 1000 - Date.now() });
}

export function clearAuthCookie(res) {
  res.clearCookie(env.COOKIE_NAME, authCookieOptions());
}