import * as UserService from '../services/UserService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadedPath } from '../utils/uploadedFile.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await UserService.listUsers(req.validated.query));
});

export const show = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.getUser(req.params.id) });
});

export const create = asyncHandler(async (req, res) => {
  const user = await UserService.createUser(req.body);
  res.status(201).json({ user });
});

export const update = asyncHandler(async (req, res) => {
  const user = await UserService.updateUser(req.params.id, req.body, req.user);
  res.json({ user });
});

export const remove = asyncHandler(async (req, res) => {
  await UserService.deleteUser(req.params.id, req.user);
  res.json({ message: 'Admin user deleted' });
});

export const uploadSignature = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.setUserImage(req.params.id, 'signature', uploadedPath(req)) });
});

export const removeSignature = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.removeUserImage(req.params.id, 'signature') });
});

export const uploadStamp = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.setUserImage(req.params.id, 'stamp', uploadedPath(req)) });
});

export const removeStamp = asyncHandler(async (req, res) => {
  res.json({ user: await UserService.removeUserImage(req.params.id, 'stamp') });
});