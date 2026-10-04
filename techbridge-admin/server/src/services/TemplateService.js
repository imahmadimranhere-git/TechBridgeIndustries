import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import env from '../config/env.js';
import { TEMPLATE_ROOT } from '../config/paths.js';
import { registerHelpers } from '../templates/helpers.js';

const PDF_ROOT = path.join(TEMPLATE_ROOT, 'pdf');
const SAFE_NAME = /^[a-z0-9-]+$/;

// A private Handlebars instance just for PDFs (emails get their own in Phase 13)
const hbs = Handlebars.create();
registerHelpers(hbs);

// In development templates are re-read on every render so edits show up instantly
const useCache = env.isProduction;
const compiled = new Map();
let partialsLoaded = false;

async function compileFile(filePath) {
  if (useCache && compiled.has(filePath)) return compiled.get(filePath);
  const template = hbs.compile(await fs.readFile(filePath, 'utf8'));
  if (useCache) compiled.set(filePath, template);
  return template;
}

async function loadPartials() {
  if (useCache && partialsLoaded) return;
  const dir = path.join(PDF_ROOT, 'partials');
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.hbs'));
  for (const file of files) {
    hbs.registerPartial(path.basename(file, '.hbs'), await fs.readFile(path.join(dir, file), 'utf8'));
  }
  partialsLoaded = true;
}

/** Renders documents/<name>.hbs inside layouts/main.hbs */
export async function renderPdfHtml(documentName, context) {
  if (!SAFE_NAME.test(documentName)) throw new Error(`Invalid PDF template name: ${documentName}`);
  await loadPartials();
  const [documentTemplate, layout] = await Promise.all([
    compileFile(path.join(PDF_ROOT, 'documents', `${documentName}.hbs`)),
    compileFile(path.join(PDF_ROOT, 'layouts', 'main.hbs')),
  ]);
  return layout({ ...context, body: documentTemplate(context) });
}

/** Puppeteer footerTemplate (printed on every page) */
export async function renderPdfFooter(context) {
  const footer = await compileFile(path.join(PDF_ROOT, 'layouts', 'footer.hbs'));
  return footer(context);
}