import { closeBrowser, createPdf, getBrowserLaunchCount, renderDocumentHtml } from '../../src/services/PdfService.js';
import { invalidateSettingsCache, updateSettings } from '../../src/services/SettingsService.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/testDb.js';

const sample = (overrides = {}) => ({
  title: 'Test',
  items: [{ description: 'Design', qty: 2, rate: 500000, amount: 1000000 }],
  subtotal: 1000000,
  total: 1000000,
  ...overrides,
});

beforeAll(startTestDb);
afterEach(async () => {
  await clearTestDb();
  invalidateSettingsCache();
});
afterAll(async () => {
  await closeBrowser();
  await stopTestDb();
});

describe('PDF templates', () => {
  test('company details from settings are HTML-escaped', async () => {
    await updateSettings({ companyName: '<script>alert(1)</script>' });
    const { html } = await renderDocumentHtml('sample', sample());
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('money uses the currency symbol from settings', async () => {
    await updateSettings({ currencySymbol: 'PKR' });
    const { html } = await renderDocumentHtml('sample', sample({ total: 12500000 }));
    expect(html).toContain('PKR 125,000');
  });

  test('without a logo a text logo with initials is shown', async () => {
    const { html } = await renderDocumentHtml('sample', sample());
    expect(html).toContain('text-logo__badge');
    expect(html).toContain('>TBI<');
  });

  test('the footer contains the verification code and a QR image', async () => {
    const { footerTemplate } = await renderDocumentHtml('sample', sample(), {
      verification: { code: 'TBI-TST-0001-DEMO' },
    });
    expect(footerTemplate).toContain('TBI-TST-0001-DEMO');
    expect(footerTemplate).toContain('data:image/png;base64,');
    expect(footerTemplate).toContain('pageNumber');
  });

  test('unsafe template names are refused', async () => {
    await expect(renderDocumentHtml('../../.env', {})).rejects.toThrow('Invalid PDF template name');
  });
});

describe('PDF rendering', () => {
  test('creates real PDFs and reuses one browser', async () => {
    const first = await createPdf('sample', sample(), { verification: { code: 'TBI-TST-0001-DEMO' } });
    const second = await createPdf('sample', sample());

    expect(first.subarray(0, 4).toString()).toBe('%PDF');
    expect(second.subarray(0, 4).toString()).toBe('%PDF');
    expect(getBrowserLaunchCount()).toBe(1);
  });

  test('parallel requests share the same browser', async () => {
    const pdfs = await Promise.all([1, 2, 3, 4, 5].map(() => createPdf('sample', sample())));
    expect(pdfs.every((pdf) => pdf.subarray(0, 4).toString() === '%PDF')).toBe(true);
    expect(getBrowserLaunchCount()).toBe(1);
  });
});