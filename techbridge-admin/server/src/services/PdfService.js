import puppeteer from 'puppeteer';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { qrDataUri } from '../utils/qr.js';
import { getDocumentBranding } from './BrandingService.js';
import { renderPdfFooter, renderPdfHtml } from './TemplateService.js';
import { verificationUrl } from './VerificationService.js';

const PAGE_MARGIN = { top: '14mm', right: '14mm', bottom: '26mm', left: '14mm' };
const MAX_CONCURRENT_PAGES = 3;
const RENDER_TIMEOUT_MS = 30_000;

/* ------------------------------------------------------------------ */
/* One shared browser (singleton)                                      */
/* ------------------------------------------------------------------ */

let browserPromise = null;
let launchCount = 0;

export const getBrowserLaunchCount = () => launchCount;

async function launchBrowser() {
  launchCount += 1;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  browser.on('disconnected', () => {
    browserPromise = null;
    logger.warn('PDF browser disconnected; it will restart with the next PDF');
  });
  logger.info('PDF browser started');
  return browser;
}

function getBrowser() {
  // Storing the PROMISE means two PDFs requested at the same moment still share one launch
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  if (browser) {
    browser.removeAllListeners('disconnected');
    await browser.close().catch(() => {});
    logger.info('PDF browser closed');
  }
}

/* ------------------------------------------------------------------ */
/* At most N pages at once, so a burst of downloads can't exhaust RAM  */
/* ------------------------------------------------------------------ */

let activePages = 0;
const waiting = [];

function acquireSlot() {
  if (activePages < MAX_CONCURRENT_PAGES) {
    activePages += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function releaseSlot() {
  const next = waiting.shift();
  if (next) next(); // hand the slot straight to the next waiting request
  else activePages -= 1;
}

/* ------------------------------------------------------------------ */
/* HTML -> PDF                                                         */
/* ------------------------------------------------------------------ */

export async function htmlToPdf(html, { footerTemplate = '<span></span>' } = {}) {
  await acquireSlot();
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Everything is embedded as data: URIs; block any other request a template might try
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().startsWith('data:')) request.continue();
      else request.abort();
    });

    await page.setContent(html, { waitUntil: 'load', timeout: RENDER_TIMEOUT_MS });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate,
      margin: PAGE_MARGIN,
      timeout: RENDER_TIMEOUT_MS,
    });
    return Buffer.from(pdf);
  } finally {
    // Always close the tab, even if rendering failed
    if (page) await page.close().catch(() => {});
    releaseSlot();
  }
}

/* ------------------------------------------------------------------ */
/* Templates -> PDF                                                    */
/* ------------------------------------------------------------------ */

async function buildContext(data, verification) {
  const branding = await getDocumentBranding();

  let verificationContext = null;
  if (verification?.code) {
    const url = verificationUrl(verification.code);
    verificationContext = { code: verification.code, url, qrDataUri: await qrDataUri(url) };
  }

  return { ...data, branding, verification: verificationContext, generatedAt: new Date() };
}

/** Final HTML + footer (also handy for debugging a template in the browser) */
export async function renderDocumentHtml(templateName, data = {}, { verification } = {}) {
  const context = await buildContext(data, verification);
  const [html, footerTemplate] = await Promise.all([renderPdfHtml(templateName, context), renderPdfFooter(context)]);
  return { html, footerTemplate, context };
}

/**
 * createPdf('invoice', { invoice, client, ... }, { verification: { code } })
 * Returns a Buffer with the PDF bytes.
 */
export async function createPdf(templateName, data = {}, options = {}) {
  const { html, footerTemplate } = await renderDocumentHtml(templateName, data, options);
  return htmlToPdf(html, { footerTemplate });
}

export default { createPdf, renderDocumentHtml, htmlToPdf, closeBrowser };