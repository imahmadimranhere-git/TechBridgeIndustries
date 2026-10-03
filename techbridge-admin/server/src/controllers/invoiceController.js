import * as InvoiceService from '../services/InvoiceService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await InvoiceService.listInvoices(req.validated.query));
});

export const show = asyncHandler(async (req, res) => {
  res.json(await InvoiceService.getInvoiceDetail(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.createInvoice(req.body, req.user);
  res.status(201).json({ invoice });
});

export const update = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.updateInvoice(req.params.id, req.body);
  res.json({ invoice });
});

export const remove = asyncHandler(async (req, res) => {
  await InvoiceService.deleteInvoice(req.params.id);
  res.json({ message: 'Invoice deleted' });
});

export const duplicate = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.duplicateInvoice(req.params.id, req.user);
  res.status(201).json({ invoice });
});

export const markSent = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.markAsSent(req.params.id);
  res.json({ invoice });
});