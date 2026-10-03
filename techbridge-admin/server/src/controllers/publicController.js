import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPublicBranding } from '../services/SettingsService.js';
import { lookupPublic } from '../services/VerificationService.js';

// GET /api/health
export const health = (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
};

// GET /api/public/branding
export const branding = asyncHandler(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(await getPublicBranding());
});

// GET /api/public/verify/:code
export const verifyDocument = asyncHandler(async (req, res) => {
  const document = await lookupPublic(req.params.code);
  if (!document) throw ApiError.notFound('Document not found');
  res.json({ document });
});