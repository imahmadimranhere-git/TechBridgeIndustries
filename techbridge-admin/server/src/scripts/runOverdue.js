import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { markOverdueInvoices } from '../jobs/overdueInvoices.js';

// Runs the overdue check once, without waiting for the schedule
async function main() {
  await connectDB();
  const updated = await markOverdueInvoices();
  logger.info(`[OK] Done. ${updated} invoice(s) changed.`);
}

main()
  .catch((err) => {
    logger.error(`Overdue run failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });