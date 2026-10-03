import * as DealService from '../services/DealService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await DealService.listDeals(req.validated.query));
});

export const show = asyncHandler(async (req, res) => {
  res.json(await DealService.getDealDetail(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  const deal = await DealService.createDeal(req.body, req.user);
  res.status(201).json({ deal });
});

export const update = asyncHandler(async (req, res) => {
  const deal = await DealService.updateDeal(req.params.id, req.body);
  res.json({ deal });
});

export const remove = asyncHandler(async (req, res) => {
  await DealService.deleteDeal(req.params.id);
  res.json({ message: 'Deal deleted' });
});