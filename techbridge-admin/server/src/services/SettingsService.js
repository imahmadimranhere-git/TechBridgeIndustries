import NodeCache from 'node-cache';
import { DEFAULT_SETTINGS, PUBLIC_SETTING_KEYS } from '../config/defaultSettings.js';
import { Setting } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { toUploadUrl } from '../utils/uploadUrl.js';

// useClones: callers get their own copy, so nobody can change the cached object by accident
const cache = new NodeCache({ stdTTL: 300, useClones: true });
const CACHE_KEY = 'settings:all';

export function invalidateSettingsCache() {
  cache.del(CACHE_KEY);
}

/** All settings as one object: database values on top of the defaults */
export async function getSettings() {
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  const rows = await Setting.find().lean();
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const settings = { ...structuredClone(DEFAULT_SETTINGS), ...stored };

  cache.set(CACHE_KEY, settings);
  return settings;
}

export async function getSetting(key) {
  const settings = await getSettings();
  return settings[key];
}

/** Saves the given keys and clears the cache so every page sees the change immediately */
export async function updateSettings(patch = {}) {
  const keys = Object.keys(patch);
  const unknown = keys.filter((key) => !(key in DEFAULT_SETTINGS));
  if (unknown.length) throw ApiError.badRequest(`Unknown setting(s): ${unknown.join(', ')}`);
  if (!keys.length) return getSettings();

  await Setting.bulkWrite(
    keys.map((key) => ({
      updateOne: { filter: { key }, update: { $set: { value: patch[key] } }, upsert: true },
    }))
  );

  invalidateSettingsCache();
  return getSettings();
}

/** Safe subset for public pages (login, verify, favicon) */
export async function getPublicBranding() {
  const settings = await getSettings();
  const branding = Object.fromEntries(PUBLIC_SETTING_KEYS.map((key) => [key, settings[key]]));
  delete branding.logoPath;
  branding.logoUrl = toUploadUrl(settings.logoPath);
  return branding;
}

export default { getSettings, getSetting, updateSettings, getPublicBranding, invalidateSettingsCache };