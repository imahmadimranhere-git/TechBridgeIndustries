import fsp from 'node:fs/promises';
import mongoose from 'mongoose';
import multer from 'multer';
import env from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

// Unknown routes
export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Turns known library errors into ApiErrors with friendly messages
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, fieldError]) => [field, fieldError.message])
    );
    return ApiError.badRequest('Please fix the highlighted fields', errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for "${err.path}"`, { [err.path]: 'Invalid value' });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? err.keyPattern ?? {})[0] ?? 'field';
    return new ApiError(409, `A record with this ${field} already exists`, { [field]: 'Already exists' });
  }

  if (err?.name === 'ZodError') {
    const errors = {};
    for (const issue of err.issues ?? []) errors[issue.path.join('.') || '_root'] ??= issue.message;
    return ApiError.badRequest('Please fix the highlighted fields', errors);
  }

  if (err instanceof multer.MulterError) return ApiError.badRequest(err.message);
  if (err?.type === 'entity.parse.failed') return ApiError.badRequest('Request body is not valid JSON');
  if (err?.type === 'entity.too.large') return new ApiError(413, 'Request is too large');

  return null;
}

/**
 * Every error response has the same shape: { message, errors }
 * Stack traces are only included in development.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // A failed request should never leave an orphaned uploaded file behind
  if (req.file?.path) fsp.unlink(req.file.path).catch(() => {});

  if (res.headersSent) return next(err);

  const known = normalizeError(err);
  const status = known?.statusCode ?? err.statusCode ?? err.status ?? 500;
  const isServerError = status >= 500;

  if (isServerError) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);
  } else {
    logger.debug(`${req.method} ${req.originalUrl} -> ${status} ${known?.message ?? err.message}`);
  }

  const body = {
    message:
      isServerError && env.isProduction
        ? 'Something went wrong on our side. Please try again.'
        : (known?.message ?? err.message ?? 'Something went wrong'),
    errors: known?.errors ?? {},
  };
  if (isServerError && !env.isProduction) body.stack = err.stack;

  return res.status(status).json(body);
}