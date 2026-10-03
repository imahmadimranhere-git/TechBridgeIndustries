import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { clearAuthCookie, setAuthCookie, signAuthToken } from '../utils/authToken.js';
import { serializeUser } from '../utils/serializers.js';

// Compared against when the email doesn't exist, so both cases take the same time
const dummyHashPromise = bcrypt.hash('timing-safe-dummy-password', 12);

const INVALID_LOGIN = 'Email or password is incorrect';

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    await bcrypt.compare(password, await dummyHashPromise);
    throw ApiError.unauthorized(INVALID_LOGIN);
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) throw ApiError.unauthorized(INVALID_LOGIN);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  setAuthCookie(res, signAuthToken(user));
  res.json({ user: serializeUser(user) });
});

// POST /api/auth/logout
export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
};

// GET /api/auth/me  (requireAuth runs first)
export const me = (req, res) => {
  res.json({ user: serializeUser(req.user) });
};