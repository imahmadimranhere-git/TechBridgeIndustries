import rateLimit from 'express-rate-limit';

const jsonHandler = (message) => (_req, res, _next, options) =>
  res.status(options.statusCode).json({ message, errors: {} });

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

// Brute-force protection: only FAILED logins count
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: jsonHandler('Too many login attempts. Please wait 15 minutes and try again.'),
});

// Public document verification page
export const verifyLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 30,
  handler: jsonHandler('Too many verification requests. Please try again in a minute.'),
});

// Generous safety net for the whole API
export const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  handler: jsonHandler('Too many requests. Please slow down and try again shortly.'),
});