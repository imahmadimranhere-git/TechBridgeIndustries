import fs from 'node:fs/promises';
import path from 'node:path';
import logger from '../config/logger.js';
import { SRC_ROOT } from '../config/paths.js';
import { resolveUploadPath } from '../middleware/upload.js';
import { fileToDataUri } from '../utils/dataUri.js';
import { getSettings } from './SettingsService.js';

const FONT_DIR = path.join(SRC_ROOT, 'fonts');
const FONT_FILES = [
  { file: 'NotoSans-Regular.ttf', weight: 400 },
  { file: 'NotoSans-Bold.ttf', weight: 700 },
];

let fontCssPromise = null;
// Uploaded files have random names, so a path never points to different content: safe to cache
const imageCache = new Map();

async function buildFontCss() {
  const faces = [];
  for (const { file, weight } of FONT_FILES) {
    try {
      const data = await fs.readFile(path.join(FONT_DIR, file));
      faces.push(
        `@font-face{font-family:'DocFont';font-style:normal;font-weight:${weight};` +
          `src:url(data:font/ttf;base64,${data.toString('base64')}) format('truetype');}`
      );
    } catch {
      logger.warn(`PDF font missing: src/fonts/${file} (falling back to system fonts)`);
    }
  }
  return faces.join('\n');
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