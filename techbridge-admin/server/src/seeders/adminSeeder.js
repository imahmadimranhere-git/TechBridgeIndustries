import env from '../config/env.js';
import logger from '../config/logger.js';
import { User } from '../models/index.js';

// Creates the first admin from .env. Never changes an existing admin's password.
export async function seedAdmin() {
  const email = env.SEED_ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    const firstAdmin = await User.findOne().sort({ createdAt: 1 });
    if (firstAdmin) {
      logger.warn(`SEED_ADMIN_EMAIL/PASSWORD not set; using existing admin ${firstAdmin.email}`);
      return firstAdmin;
    }
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in server/.env to create the first admin.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    logger.info(`Admin already exists: ${existing.email} (password not changed)`);
    return existing;
  }

  const admin = await User.create({
    name: env.SEED_ADMIN_NAME,
    designation: 'CEO',
    email,
    password,
  });
  logger.info(`✅ Admin created: ${admin.email}`);
  return admin;
}