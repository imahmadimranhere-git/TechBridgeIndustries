import fs from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

/** Reads a file and returns it as an embeddable "data:" URI */
export async function fileToDataUri(absolutePath) {
  const mime = MIME_TYPES[path.extname(absolutePath).toLowerCase()] ?? 'application/octet-stream';
  const data = await fs.readFile(absolutePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

export const svgToDataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;