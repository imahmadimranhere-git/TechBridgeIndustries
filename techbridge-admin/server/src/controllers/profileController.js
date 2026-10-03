import * as UserService from '../services/UserService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { setAuthCookie, signAuthToken } from '../utils/authToken.js';
import { serializeUser } from '../utils/serializers.js';
import { uploadedPath } from '../utils/uploadedFile.js';

// The logged-in admin's own account ("My Profile")

export const show = (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

export const update = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.updateProfile(req.user._id, req.body) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await UserService.changePassword(req.user._id, req.body);
  // Old tokens are now invalid; give THIS browser a fresh one so it stays logged in
  setAuthCookie(res, signAuthToken(user));
  res.json({ message: 'Password changed. You have been logged out on other devices.' });
});

export const uploadSignature = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.setUserImage(req.user._id, 'signature', uploadedPath(req)) });
});

export const removeSignature = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.removeUserImage(req.user._id, 'signature') });
});

export const uploadStamp = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.setUserImage(req.user._id, 'stamp', uploadedPath(req)) });
});

export const removeStamp = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.removeUserImage(req.user._id, 'stamp') });
});