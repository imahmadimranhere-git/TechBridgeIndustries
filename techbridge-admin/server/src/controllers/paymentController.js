import * as PaymentService from '../services/PaymentService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await PaymentService.listPayments(req.validated.query));
});

export const show = asyncHandler(async (req, res) => {
  res.json({ payment: await PaymentService.getPaymentDetail(req.params.id) });
});

export const create = asyncHandler(async (req, res) => {
  const payment = await PaymentService.createPayment(req.body, req.user);
  res.status(201).json({ payment });
});

export const remove = asyncHandler(async (req, res) => {
  await PaymentService.deletePayment(req.params.id);
  res.json({ message: 'Payment deleted' });
});