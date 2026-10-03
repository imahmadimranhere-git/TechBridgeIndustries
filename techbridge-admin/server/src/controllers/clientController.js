import * as ClientService from '../services/ClientService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await ClientService.listClients(req.validated.query));
});

export const show = asyncHandler(async (req, res) => {
  res.json(await ClientService.getClientProfile(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  const client = await ClientService.createClient(req.body, req.user);
  res.status(201).json({ client });
});

export const update = asyncHandler(async (req, res) => {
  const client = await ClientService.updateClient(req.params.id, req.body);
  res.json({ client });
});

export const remove = asyncHandler(async (req, res) => {
  await ClientService.deleteClient(req.params.id);
  res.json({ message: 'Client deleted' });
});