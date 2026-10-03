import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always load server/.env, no matter which folder the process was started from
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// Treat empty values like "SMTP_HOST=" as "not provided"
const blankToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().optional());

const numberOr = (fallback) =>
  z.preprocess(blankToUndefined, z.coerce.number().positive().default(fallback));

const booleanOr = (fallback) =>
  z
    .preprocess(blankToUndefined, z.enum(['true', 'false']).default(fallback ? 'true' : 'false'))
    .transform((value) => value === 'true');

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: numberOr(5000),
  APP_TIMEZONE: z.string().default('Asia/Karachi'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // URLs
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a full URL like http://localhost:5173'),
  SERVER_URL: z.string().url('SERVER_URL must be a full URL like http://localhost:5000'),

  // Database
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .refine(
      (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      'MONGODB_URI must start with mongodb:// or mongodb+srv://'
    ),

  // Auth
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters (generate one with the command in .env.example)'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('tbi_token'),

  // Seeder (only required when running the seeder)
  SEED_ADMIN_NAME: z.string().default('Super Admin'),
  SEED_ADMIN_EMAIL: z.preprocess(blankToUndefined, z.string().email().optional()),
  SEED_ADMIN_PASSWORD: z.preprocess(
    blankToUndefined,
    z.string().min(8, 'SEED_ADMIN_PASSWORD must be at least 8 characters').optional()
  ),

  // Email
  SMTP_HOST: optionalText,
  SMTP_PORT: numberOr(587),
  SMTP_SECURE: booleanOr(false),
  SMTP_USER: optionalText,
  SMTP_PASS: optionalText,
  MAIL_FROM: z.string().default('TechBridgeIndustries <no-reply@example.com>'),

  // Uploads & PDFs
  UPLOAD_MAX_SIZE_MB: numberOr(2),
  PUPPETEER_EXECUTABLE_PATH: optionalText,

  // Jobs
  OVERDUE_CRON: z.string().default('0 1 * * *'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Invalid environment variables in server/.env:\n');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nFix the values above (see .env.example) and try again.\n');
  process.exit(1);
}

const data = parsed.data;

// Make every Date calculation (month ranges, cron) use the business timezone
process.env.TZ = data.APP_TIMEZONE;

const env = Object.freeze({
  ...data,
  isProduction: data.NODE_ENV === 'production',
  isDevelopment: data.NODE_ENV === 'development',
  isTest: data.NODE_ENV === 'test',
  smtpConfigured: Boolean(data.SMTP_HOST && data.SMTP_USER && data.SMTP_PASS),
  uploadMaxBytes: data.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
});

export default env;