import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import env from '../config/env.js';
import { TEMPLATE_ROOT } from '../config/paths.js';
import { registerHelpers } from '../templates/helpers.js';

const PDF_ROOT = path.join(TEMPLATE_ROOT, 'pdf');
const EMAIL_ROOT = path.join(TEMPLATE_ROOT, 'email');
const SAFE_NAME = /^[a-z0-9-]+$/;

// Separate Handlebars instances so PDF and email partials can never clash
const pdfHbs = Handlebars.create();
const emailHbs = Handlebars.create();
registerHelpers(pdfHbs);
registerHelpers(emailHbs);

// In development templates are re-read on every render so edits show up instantly
const useCache = env.isProduction;
const compiled = new Map();
let pdfPartialsLoaded = false;

async function compileFile(engine, filePath) {
  if (useCache && compiled.has(filePath)) return compiled.get(filePath);
  const template = engine.compile(await fs.readFile(filePath, 'utf8'));
  if (useCache) compiled.set(filePath, template);
  return template;
}

async function loadPdfPartials() {
  if (useCache && pdfPartialsLoaded) return;
  const dir = path.join(PDF_ROOT, 'partials');
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.hbs'));
  for (const file of files) {
    pdfHbs.registerPartial(path.basename(file, '.hbs'), await fs.readFile(path.join(dir, file), 'utf8'));
  }
  pdfPartialsLoaded = true;
}

function assertSafeName(name, kind) {
  if (!SAFE_NAME.test(name)) throw new Error(`Invalid ${kind} template name: ${name}`);
}

/** Renders pdf/documents/<name>.hbs inside pdf/layouts/main.hbs */
export async function renderPdfHtml(documentName, context) {
  assertSafeName(documentName, 'PDF');
  await loadPdfPartials();
  const [documentTemplate, layout] = await Promise.all([
    compileFile(pdfHbs, path.join(PDF_ROOT, 'documents', `${documentName}.hbs`)),
    compileFile(pdfHbs, path.join(PDF_ROOT, 'layouts', 'main.hbs')),
  ]);
  return layout({ ...context, body: documentTemplate(context) });
}

/** Puppeteer footerTemplate (printed on every page) */
export async function renderPdfFooter(context) {
  const footer = await compileFile(pdfHbs, path.join(PDF_ROOT, 'layouts', 'footer.hbs'));
  return footer(context);
}

/** Renders email/<name>.hbs inside email/layout.hbs */
export async function renderEmail(name, context) {
  assertSafeName(name, 'email');
  const [bodyTemplate, layout] = await Promise.all([
    compileFile(emailHbs, path.join(EMAIL_ROOT, `${name}.hbs`)),
    compileFile(emailHbs, path.join(EMAIL_ROOT, 'layout.hbs')),
  ]);
  return layout({ ...context, body: bodyTemplate(context) });
}