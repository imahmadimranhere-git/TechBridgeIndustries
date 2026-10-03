import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import env from '../config/env.js';
import { UPLOAD_FOLDERS, UPLOAD_ROOT } from '../config/paths.js';
import ApiError from '../utils/ApiError.js';

// SVG is deliberately NOT allowed: it can contain scripts
const IMAGE_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

// The first bytes of a real file prove its type, whatever the browser claims
const FILE_SIGNATURES = {
  'image/png': (head) =>
    head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (head) => head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
  'image/webp': (head) =>
    head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP',
};

for (const folder of Object.values(UPLOAD_FOLDERS)) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
}

async function readFileHead(filePath, length = 12) {
  const handle = await fsp.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

/** Absolute path for a stored relative path like "signatures/abc.png" (null if unsafe) */
export function resolveUploadPath(relativePath) {
  if (!relativePath) return null;
  const absolute = path.resolve(UPLOAD_ROOT, relativePath);
  // Never allow paths like "../../.env" to escape the uploads folder
  return absolute.startsWith(UPLOAD_ROOT + path.sep) ? absolute : null;
}

/** Deletes a stored upload; missing files are ignored */
export async function removeUpload(relativePath) {
  const absolute = resolveUploadPath(relativePath);
  if (!absolute) return;
  await fsp.unlink(absolute).catch((err) => {
    if (err.code !== 'ENOENT') throw err;
  });
}

function translateUploadError(err, fieldName) {
  if (err instanceof ApiError) return err;
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `Image must be ${env.UPLOAD_MAX_SIZE_MB}MB or smaller`,
      LIMIT_FILE_COUNT: 'Please upload only one image',
      LIMIT_UNEXPECTED_FILE: `Unexpected file field. Use "${fieldName}"`,
    };
    const message = messages[err.code] ?? err.message;
    return ApiError.badRequest(message, { [fieldName]: message });
  }
  return err;
}

/**
 * Accepts ONE optional image in `fieldName` and stores it in uploads/<folder>
 * with a random name. On success: req.file.relativePath = '<folder>/<random>.png'
 */
export function uploadImage(folder, fieldName = 'image') {
  const upload = multer({
    storage: multer.diskStorage({
      destination: path.join(UPLOAD_ROOT, folder),
      filename: (_req, file, cb) =>
        cb(null, `${crypto.randomBytes(16).toString('hex')}${IMAGE_TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: env.uploadMaxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
      const message = 'Only PNG, JPG or WEBP images are allowed';
      return cb(ApiError.badRequest(message, { [fieldName]: message }));
    },
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, async (err) => {
      if (err) return next(translateUploadError(err, fieldName));
      if (!req.file) return next();

      try {
        const head = await readFileHead(req.file.path);
        if (!FILE_SIGNATURES[req.file.mimetype](head)) {
          await fsp.unlink(req.file.path).catch(() => {});
          req.file = undefined;
          const message = 'This file is not a real image';
          return next(ApiError.badRequest(message, { [fieldName]: message }));
        }
        req.file.relativePath = `${folder}/${req.file.filename}`;
        return next();
      } catch (readError) {
        return next(readError);
      }
    });
  };
}