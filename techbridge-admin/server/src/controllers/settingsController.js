import { DEFAULT_COMPLETION_LETTER } from '../config/defaultSettings.js';
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
  const stored = await getSettings();
  // Settings saved before this feature have no completion text yet: show the built-in one
  const settings = {
    ...stored,
    completionLetterTemplate: stored.completionLetterTemplate || DEFAULT_COMPLETION_LETTER,
  };
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

  // Other signatories may be inactive admins (e.g. a founder who signs but never logs in)
  if (patch.coSignatoryIds) {
    patch.coSignatoryIds = [...new Set(patch.coSignatoryIds.map(String))];
    const found = await User.countDocuments({ _id: { $in: patch.coSignatoryIds } });
    if (found !== patch.coSignatoryIds.length) {
      throw ApiError.badRequest('One of the selected signatories was not found', { coSignatory1: 'Choose an admin' });
    }
  }
  if (patch.coSignatoryId && !(await User.exists({ _id: patch.coSignatoryId }))) {
    throw ApiError.badRequest('Selected second signatory was not found', { coSignatoryId: 'Choose an admin' });
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
