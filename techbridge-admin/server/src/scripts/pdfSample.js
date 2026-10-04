import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { SERVER_ROOT } from '../config/paths.js';
import { closeBrowser, createPdf } from '../services/PdfService.js';
import { toMinor } from '../utils/money.js';

// 30 rows so the PDF spans two pages (checks page numbers and the repeated table header)
function sampleData() {
  const items = Array.from({ length: 30 }, (_, index) => {
    const qty = (index % 3) + 1;
    const rate = toMinor(2500 + index * 750);
    return { description: `Sample service line ${index + 1}`, qty, rate, amount: qty * rate };
  });
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { title: 'PDF Branding Test', items, subtotal: total, total };
}

async function main() {
  await connectDB();
  const outDir = path.join(SERVER_ROOT, 'tmp');
  await fs.mkdir(outDir, { recursive: true });

  // First PDF starts Chrome; the second reuses it (compare the times)
  for (const run of [1, 2]) {
    const started = Date.now();
    const pdf = await createPdf('sample', sampleData(), { verification: { code: 'TBI-TST-0001-DEMO' } });
    const file = path.join(outDir, `sample-${run}.pdf`);
    await fs.writeFile(file, pdf);
    logger.info(`✅ PDF ${run} created in ${Date.now() - started} ms (${Math.round(pdf.length / 1024)} KB): ${file}`);
  }
}

main()
  .catch((err) => {
    logger.error(`❌ PDF sample failed: ${err.stack || err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser();
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });