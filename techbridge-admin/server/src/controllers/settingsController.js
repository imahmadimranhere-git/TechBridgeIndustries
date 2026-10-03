import { removeUpload } from '../middleware/upload.js';
import { User } from '../models/index.js';
import * as InvoiceService from '../services/InvoiceService.js';
import { getSettings, updateSettings } from '../services/SettingsService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadedPath } from '../utils/uploadedFile.js';
import { toUploadUrl } from '../utils/uploadUrl.js';

const withoutUndefined = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

async function settingsResponse() {
  const settings = await getSettings();
  return {
    settings,
    logoUrl: toUploadUrl(settings.logoPath),
    stampUrl: toUploadUrl(settings.stampPath),
    nextInvoiceNumber: await InvoiceService.getNextInvoiceNumber(),
  };
}

export const show = asyncHandler(async (_req, res) => {
  res.json(await settingsResponse());
});

export const update = asyncHandler(async (req, res) => {
  const { nextInvoiceNumber, documentOptions, ...patch } = withoutUndefined(req.body);
  const current = await getSettings();

  if (patch.defaultSignatoryId) {
    const signer = await User.exists({ _id: patch.defaultSignatoryId, isActive: true });
    if (!signer) {
      throw ApiError.badRequest('Selected signatory was not found or is inactive', {
        defaultSignatoryId: 'Choose an active admin',
      });
    }
  }

  if (patch.stampMode === 'uploaded' && !current.stampPath) {
    throw ApiError.badRequest('Upload a company stamp first', { stampMode: 'No stamp uploaded yet' });
  }

  // Merge per-document toggles so sending one document type doesn't reset the others
  if (documentOptions) {
    patch.documentOptions = { ...current.documentOptions };
    for (const [type, options] of Object.entries(documentOptions)) {
      if (options) patch.documentOptions[type] = { ...current.documentOptions?.[type], ...withoutUndefined(options) };
    }
  }

  if (nextInvoiceNumber !== undefined) await InvoiceService.setNextInvoiceNumber(nextInvoiceNumber);
  if (Object.keys(patch).length) await updateSettings(patch);

  res.json(await settingsResponse());
});

/* ---------- logo ---------- */

export const uploadLogo = asyncHandler(async (req, res) => {
  const newPath = uploadedPath(req);
  const { logoPath: oldPath } = await getSettings();
  await updateSettings({ logoPath: newPath });
  if (oldPath && oldPath !== newPath) await removeUpload(oldPath);
  res.json(await settingsResponse());
});

export const removeLogo = asyncHandler(async (_req, res) => {
  const { logoPath } = await getSettings();
  await updateSettings({ logoPath: null });
  await removeUpload(logoPath);
  res.json(await settingsResponse());
});

/* ---------- company stamp ---------- */

export const uploadStamp = asyncHandler(async (req, res) => {
  const newPath = uploadedPath(req);
  const { stampPath: oldPath } = await getSettings();
  await updateSettings({ stampPath: newPath, stampMode: 'uploaded' });
  if (oldPath && oldPath !== newPath) await removeUpload(oldPath);
  res.json(await settingsResponse());
});

export const removeStamp = asyncHandler(async (_req, res) => {
  const { stampPath, stampMode } = await getSettings();
  await updateSettings({ stampPath: null, stampMode: stampMode === 'uploaded' ? 'auto' : stampMode });
  await removeUpload(stampPath);
  res.json(await settingsResponse());
});