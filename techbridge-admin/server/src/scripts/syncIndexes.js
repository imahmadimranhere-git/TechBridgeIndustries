import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import * as models from '../models/index.js';

async function main() {
  await connectDB();

  for (const [name, Model] of Object.entries(models)) {
    // Creates missing indexes and removes ones no longer defined in the schema
    await Model.syncIndexes();
    const indexes = await Model.listIndexes();
    logger.info(`${name.padEnd(22)} ${indexes.length} indexes: ${indexes.map((i) => i.name).join(', ')}`);
  }

  logger.info('✅ All models compiled and indexes are in sync.');
}

main()
  .catch((err) => {
    logger.error(`❌ Index sync failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });