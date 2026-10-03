import { getDashboard } from '../services/DashboardService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const show = asyncHandler(async (req, res) => {
  res.json(await getDashboard(req.validated.query));
});