import fs from 'node:fs/promises';
import path from 'node:path';
import logger from '../config/logger.js';
import { SERVER_ROOT, SRC_ROOT } from '../config/paths.js';
import { resolveUploadPath } from '../middleware/upload.js';
import { fileToDataUri } from '../utils/dataUri.js';
import { getSettings } from './SettingsService.js';

/*
 * PDF font, in order of preference:
 *  1. TTF files placed by hand in src/fonts (full Noto Sans)
 *  2. The @fontsource/noto-sans npm package (latin + latin-ext subsets, includes the Rs sign)
 *  3. System fonts (a warning is logged)
 */
const TTF_DIR = path.join(SRC_ROOT, 'fonts');
const TTF_FILES = [
  { file: 'NotoSans-Regular.ttf', weight: 400 },
  { file: 'NotoSans-Bold.ttf', weight: 700 },
];

const FONTSOURCE_DIR = path.join(SERVER_ROOT, 'node_modules', '@fontsource', 'noto-sans', 'files');
const FONTSOURCE_SUBSETS = [
  {
    subset: 'latin',
    range:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    subset: 'latin-ext',
    range:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
];
const FONT_WEIGHTS = [400, 700];

let fontCssPromise = null;
// Uploaded files have random names, so a path never points to different content: safe to cache
const imageCache = new Map();

const fontFace = ({ weight, mime, format, data, range }) =>
  `@font-face{font-family:'DocFont';font-style:normal;font-weight:${weight};` +
  `src:url(data:${mime};base64,${data.toString('base64')}) format('${format}');` +
  `${range ? `unicode-range:${range};` : ''}}`;

async function ttfFontCss() {
  const faces = [];
  for (const { file, weight } of TTF_FILES) {
    const data = await fs.readFile(path.join(TTF_DIR, file)).catch(() => null);
    if (!data) return null; // need both files
    faces.push(fontFace({ weight, mime: 'font/ttf', format: 'truetype', data }));
  }
  return faces.join('\n');
}

async function fontsourceCss() {
  const faces = [];
  for (const { subset, range } of FONTSOURCE_SUBSETS) {
    for (const weight of FONT_WEIGHTS) {
      const file = path.join(FONTSOURCE_DIR, `noto-sans-${subset}-${weight}-normal.woff2`);
      const data = await fs.readFile(file).catch(() => null);
      if (!data) return null;
      faces.push(fontFace({ weight, mime: 'font/woff2', format: 'woff2', data, range }));
    }
  }
  return faces.join('\n');
}

async function buildFontCss() {
  const fromTtf = await ttfFontCss();
  if (fromTtf) {
    logger.info('PDF font: Noto Sans (src/fonts)');
    return fromTtf;
  }

  const fromPackage = await fontsourceCss();
  if (fromPackage) {
    logger.info('PDF font: Noto Sans (@fontsource/noto-sans)');
    return fromPackage;
  }

  logger.warn('PDF font missing: run "npm install @fontsource/noto-sans" (falling back to system fonts)');
  return '';
}

/** @font-face rules with the font embedded (read from disk only once) */
export function getFontCss() {
  if (!fontCssPromise) fontCssPromise = buildFontCss();
  return fontCssPromise;
}

/** "branding/abc.png" -> data URI (null when missing) */
export async function uploadToDataUri(relativePath) {
  if (!relativePath) return null;
  if (imageCache.has(relativePath)) return imageCache.get(relativePath);

  const absolute = resolveUploadPath(relativePath);
  if (!absolute) return null;
  try {
    const uri = await fileToDataUri(absolute);
    imageCache.set(relativePath, uri);
    return uri;
  } catch {
    logger.warn(`Image not found for PDF: ${relativePath}`);
    return null;
  }
}

// "TechBridgeIndustries" -> "TBI", "Acme Traders" -> "AT"
function initialsOf(name = '') {
  const capitals = name.match(/[A-Z]/g);
  if (capitals && capitals.length >= 2) return capitals.slice(0, 3).join('');
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/** Everything a PDF needs to look like TechBridgeIndustries */
export async function getDocumentBranding() {
  const settings = await getSettings();
  const [fontCss, logoDataUri] = await Promise.all([getFontCss(), uploadToDataUri(settings.logoPath)]);

  return {
    company: {
      name: settings.companyName,
      tagline: settings.tagline,
      address: settings.address,
      city: settings.city,
      country: settings.country,
      addressLine: [settings.address, settings.city, settings.country].filter(Boolean).join(', '),
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
    },
    contactLine: [settings.website, settings.email, settings.phone].filter(Boolean).join('  ·  '),
    colors: { primary: settings.brandPrimaryColor, secondary: settings.brandSecondaryColor },
    initials: initialsOf(settings.companyName),
    currencySymbol: settings.currencySymbol,
    footerText: settings.footerText,
    bankDetails: settings.bankDetails,
    logoDataUri,
    fontCss,
    // Phase 11 partials read stampMode, signatoryLabel, documentOptions from here
    settings,
  };
}