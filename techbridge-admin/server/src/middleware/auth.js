import env from '../config/env.js';
import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAuthToken } from '../utils/authToken.js';

/**
 * Allows the request only for a logged-in, active admin.
 * Puts the user document on req.user for controllers (e.g. to save signedBy).
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid session. Please log in again.'
    );
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('This account is no longer active');
  if (user.changedPasswordAfter(payload.iat)) {
    throw ApiError.unauthorized('Your password was changed. Please log in again.');
  }

  req.user = user;
  next();
});