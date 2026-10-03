import * as StaffService from '../services/StaffService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await StaffService.listStaff(req.validated.query));
});

export const show = asyncHandler(async (req, res) => {
  res.json(await StaffService.getStaffProfile(req.params.id, req.validated.query));
});

export const create = asyncHandler(async (req, res) => {
  const staff = await StaffService.createStaff(req.body);
  res.status(201).json({ staff });
});

export const update = asyncHandler(async (req, res) => {
  const staff = await StaffService.updateStaff(req.params.id, req.body);
  res.json({ staff });
});

export const remove = asyncHandler(async (req, res) => {
  await StaffService.deleteStaff(req.params.id);
  res.json({ message: 'Staff member deleted' });
});

/* ---------- payouts ---------- */

export const createPayout = asyncHandler(async (req, res) => {
  const payout = await StaffService.createPayout(req.params.id, req.body, req.user);
  res.status(201).json({ payout });
});

export const listPayouts = asyncHandler(async (req, res) => {
  res.json(await StaffService.listPayouts(req.validated.query));
});

export const removePayout = asyncHandler(async (req, res) => {
  await StaffService.deletePayout(req.params.id);
  res.json({ message: 'Payout deleted' });
});