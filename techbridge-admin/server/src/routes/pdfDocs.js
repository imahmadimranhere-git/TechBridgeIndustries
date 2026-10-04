import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { SERVER_ROOT } from '../config/paths.js';
import { Client, CommissionPayout, Deal, Invoice, Payment, Staff, User } from '../models/index.js';
import * as DocumentService from '../services/DocumentService.js';
import { closeBrowser } from '../services/PdfService.js';

// Generates every document from the demo data so they can be checked without the frontend
async function main() {
  await connectDB();
  const outDir = path.join(SERVER_ROOT, 'tmp', 'docs');
  await fs.mkdir(outDir, { recursive: true });

  const admin = await User.findOne().sort({ createdAt: 1 });
  const invoice = (await Invoice.findOne({ status: 'Overdue' })) ?? (await Invoice.findOne());
  const payment = (await Payment.findOne({ invoice: { $ne: null } }).sort({ date: -1 })) ?? (await Payment.findOne());
  const client = (await Client.findOne({ companyName: 'Malik Foods' })) ?? (await Client.findOne());
  const deal = client ? await Deal.findOne({ client: client._id }) : null;
  const payout = await CommissionPayout.findOne().sort({ date: -1 });
  const staff = (await Staff.findOne({ name: 'Ali Raza' })) ?? (await Staff.findOne());

  if (!admin || !invoice || !payment || !client || !payout || !staff) {
    throw new Error('Demo data not found. Run "npm run seed:demo" first.');
  }

  const jobs = [
    ['invoice', () => DocumentService.invoicePdf(invoice._id, admin)],
    ['receipt', () => DocumentService.receiptPdf(payment._id, admin)],
    ['client-statement', () => DocumentService.clientStatementPdf(client._id, { range: 'all_time' }, admin)],
    ['welcome-letter', () => DocumentService.welcomeLetterPdf(client._id, { dealId: deal?._id }, admin)],
    ['payout-slip', () => DocumentService.payoutSlipPdf(payout._id, admin)],
    ['commission-statement', () => DocumentService.commissionStatementPdf(staff._id, { range: 'all_time' }, admin)],
    ['financial-report', () => DocumentService.financialReportPdf({ range: 'all_time' }, admin)],
  ];

  for (const [name, build] of jobs) {
    const started = Date.now();
    const { buffer, verificationCode } = await build();
    const target = path.join(outDir, `${name}.pdf`);
    await fs.writeFile(target, buffer);
    logger.info(`[OK] ${name.padEnd(21)} ${String(Date.now() - started).padStart(5)} ms  code: ${verificationCode ?? '-'}`);
  }

  logger.info(`All documents saved in ${outDir}`);
}

main()
  .catch((err) => {
    logger.error(`Document generation failed: ${err.stack || err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser();
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });