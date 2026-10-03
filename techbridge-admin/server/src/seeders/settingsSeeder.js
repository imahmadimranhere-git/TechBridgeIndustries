import logger from '../config/logger.js';
import { Setting } from '../models/index.js';
import { DEFAULT_SETTINGS } from '../config/defaultSettings.js';

// Inserts only the settings that don't exist yet
export async function seedSettings() {
  const operations = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { $setOnInsert: { value } },
      upsert: true,
    },
  }));

  const result = await Setting.bulkWrite(operations);
  const added = result.upsertedCount;
  logger.info(`✅ Settings: ${added} added, ${operations.length - added} already set`);
}

// The first admin becomes the default signatory if none is chosen yet
export async function ensureDefaultSignatory(admin) {
  const result = await Setting.updateOne(
    { key: 'defaultSignatoryId', value: null },
    { $set: { value: String(admin._id) } }
  );
  if (result.modifiedCount) logger.info(`✅ Default signatory set to ${admin.name}`);
}