import { connectDB, disconnectDB } from '../config/db.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { Setting } from '../models/index.js';
import FinanceService from '../services/FinanceService.js';
import { formatMoney } from '../utils/money.js';
import { seedAdmin } from './adminSeeder.js';
import { ensureDefaultSignatory, seedSettings } from './settingsSeeder.js';
import { seedDemoData, wipeBusinessData } from './demoSeeder.js';

/**
 * npm run seed        -> admin + default settings (safe to run any time, also in production)
 * npm run seed:demo   -> + demo data (only if there are no clients yet)
 * npm run seed:fresh  -> wipe business data, then add demo data (development only)
 */
const args = new Set(process.argv.slice(2));
const wantsFresh = args.has('--fresh');
const wantsDemo = args.has('--demo') || wantsFresh;

async function printSummary() {
  const symbol = (await Setting.findOne({ key: 'currencySymbol' }).lean())?.value ?? 'Rs';
  const summary = await FinanceService.getSummary();
  const lines = [
    ['Total Deal Value', summary.totalDealValue],
    ['Total Received from Clients', summary.totalReceived],
    ['Remaining from Clients', summary.remainingFromClients],
    ['Commission Earned by Staff', summary.commissionEarned],
    ['Commission Paid to Staff', summary.commissionPaid],
    ['Commission Pending to Staff', summary.commissionPending],
    ['Our Remaining Balance', summary.cashInHand],
    ['Our Net Profit', summary.netProfit],
  ];

  logger.info('Financial summary (all time):');
  for (const [label, value] of lines) {
    logger.info(`   ${label.padEnd(30)} ${formatMoney(value, { symbol })}`);
  }
}

async function main() {
  if (env.isProduction && wantsDemo) {
    throw new Error('Demo data and --fresh are disabled when NODE_ENV=production.');
  }

  await connectDB();

  const admin = await seedAdmin();
  await seedSettings();
  await ensureDefaultSignatory(admin);

  if (wantsFresh) await wipeBusinessData();
  if (wantsDemo) await seedDemoData({ admin });

  await printSummary();
  logger.info('✅ Seeding finished.');
}

main()
  .catch((err) => {
    logger.error(`❌ Seeding failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });