import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { Invoice, User } from '../models/index.js';
import * as EmailService from '../services/EmailService.js';
import { closeMail } from '../services/MailService.js';
import { closeBrowser } from '../services/PdfService.js';

// Usage: npm run mail:test -- you@example.com
async function main() {
  const to = process.argv[2];
  if (!to) throw new Error('Give an email address, e.g. npm run mail:test -- you@example.com');

  await connectDB();
  const admin = await User.findOne().sort({ createdAt: 1 });
  const invoice = await Invoice.findOne().sort({ sequence: 1 });
  if (!admin || !invoice) throw new Error('Demo data not found. Run "npm run seed:demo" first.');

  const test = await EmailService.sendTestEmail(to, admin);
  logger.info(`[OK] ${test.message}`);
  if (test.previewUrl) logger.info(`     Open: ${test.previewUrl}`);

  // The invoice goes to the address given above, not to the demo client
  const result = await EmailService.emailInvoice(invoice._id, { to: [to], message: 'This is a test from the admin panel.' }, admin);
  logger.info(`[OK] Invoice ${invoice.invoiceNumber}: ${result.message}`);
  if (result.previewUrl) logger.info(`     Open: ${result.previewUrl}`);
}

main()
  .catch((err) => {
    logger.error(`Mail test failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([closeBrowser(), closeMail()]);
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });