import * as EmailService from '../services/EmailService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const invoice = asyncHandler(async (req, res) => {
  res.json(await EmailService.emailInvoice(req.params.id, req.body, req.user));
});

export const receipt = asyncHandler(async (req, res) => {
  res.json(await EmailService.emailReceipt(req.params.id, req.body, req.user));
});

export const clientStatement = asyncHandler(async (req, res) => {
  res.json(await EmailService.emailClientStatement(req.params.id, req.body, req.user));
});

export const welcomeLetter = asyncHandler(async (req, res) => {
  res.json(await EmailService.emailWelcomeLetter(req.params.id, req.body, req.user));
});

export const payoutSlip = asyncHandler(async (req, res) => {
  res.json(await EmailService.emailPayoutSlip(req.params.id, req.body, req.user));
});

export const commissionStatement = asyncHandler(async (req, res) => {
  res.json(await EmailService.emailCommissionStatement(req.params.id, req.body, req.user));
});

export const test = asyncHandler(async (req, res) => {
  res.json(await EmailService.sendTestEmail(req.body.to, req.user));
});