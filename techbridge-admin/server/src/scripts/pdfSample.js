import fs from 'node:fs/promises';
import path from 'node:path';
import { DOCUMENT_TYPE } from '../config/constants.js';
import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { SERVER_ROOT } from '../config/paths.js';
import { closeBrowser, createPdf } from '../services/PdfService.js';
import { getSettings } from '../services/SettingsService.js';
import { buildSignatory } from '../services/SignatoryService.js';
import { toMinor } from '../utils/money.js';
import { generateStampSvg } from '../utils/stampSvg.js';

// 30 rows so the PDF spans two pages (page numbers, repeated table header, watermark on every page)
function sampleData() {
  const items = Array.from({ length: 30 }, (_, index) => {
    const qty = (index % 3) + 1;
    const rate = toMinor(2500 + index * 750);
    return { description: `Sample service line ${index + 1}`, qty, rate, amount: qty * rate };
  });
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { title: 'PDF Branding Test', items, subtotal: total, total };
}

const VARIANTS = [
  { file: 'sample-paid.pdf', status: 'Paid' },
  { file: 'sample-partial.pdf', status: 'Partially Paid' },
  { file: 'sample-overdue.pdf', status: 'Overdue' },
  { file: 'sample-draft.pdf', status: 'Draft' },
];

async function main() {
  await connectDB();
  const outDir = path.join(SERVER_ROOT, 'tmp');
  await fs.mkdir(outDir, { recursive: true });

  // No signedBy -> the default signatory from Settings (the seeded admin)
  const signatory = await buildSignatory({ documentType: DOCUMENT_TYPE.INVOICE });
  logger.info(`Signatory: ${signatory.name || '(none)'}; signature image: ${signatory.signatureDataUri ? 'yes' : 'no'}`);

  for (const { file, status } of VARIANTS) {
    const started = Date.now();
    const pdf = await createPdf('sample', { ...sampleData(), status, signatory }, {
      verification: { code: 'TBI-TST-0001-DEMO' },
    });
    const target = path.join(outDir, file);
    await fs.writeFile(target, pdf);
    logger.info(`[OK] ${status.padEnd(15)} ${Date.now() - started} ms  ${target}`);
  }

  // The auto stamp on its own, to open directly in the browser
  const settings = await getSettings();
  const svg = generateStampSvg({
    companyName: settings.companyName,
    city: settings.city || 'Lahore',
    country: settings.country,
    color: settings.brandPrimaryColor,
  });
  await fs.writeFile(path.join(outDir, 'stamp-auto.svg'), svg);
  logger.info(`[OK] Stamp preview: ${path.join(outDir, 'stamp-auto.svg')}`);
}

main()
  .catch((err) => {
    logger.error(`PDF sample failed: ${err.stack || err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser();
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });