import { connectDB, disconnectDB } from '../config/db.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { User } from '../models/index.js';

// Sets the password of SEED_ADMIN_EMAIL to SEED_ADMIN_PASSWORD (from server/.env) and re-activates the account
async function main() {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in server/.env first.');
  }

  await connectDB();
  const user = await User.findOne({ email: env.SEED_ADMIN_EMAIL.toLowerCase() });
  if (!user) throw new Error(`No admin with email ${env.SEED_ADMIN_EMAIL}. Run "npm run seed" to create one.`);

  user.password = env.SEED_ADMIN_PASSWORD;
  user.isActive = true;
  await user.save();

  logger.info(`[OK] Password reset for ${user.email}. Log in with SEED_ADMIN_PASSWORD from server/.env`);
}

main()
  .catch((err) => {
    logger.error(`Reset failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });
