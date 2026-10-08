import { z } from 'zod';
import * as DocumentService from '../services/DocumentService.js';
import * as EmailService from '../services/EmailService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as emailValidators from '../validators/emailValidators.js';

/* ------------------------------------------------------------------ */
/* Input: which deal, delivery date, and an optional deliverables list */
/* ------------------------------------------------------------------ */

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const certificateInputSchema = z.object({
  dealId: z.preprocess((value) => String(value ?? ''), z.string().trim().regex(/^[a-f\d]{24}$/i, 'Choose a completed deal')),
  deliveredOn: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Delivery date is invalid')
      .transform((value) => new Date(`${value}T12:00:00`))
      .optional()
  ),
  // One deliverable per line (a list is accepted too)
  deliverables: z.preprocess(
    (value) => {
      const lines = Array.isArray(value) ? value : String(value ?? '').split('\n');
      return lines.map((line) => String(line).trim()).filter(Boolean);
    },
    z.array(z.string().max(150, 'Each deliverable can have at most 150 characters')).max(20, 'Add at most 20 deliverables')
  ),
});

// Fallback when emailValidators has no schema with the expected name
const basicEmailSchema = z.object({
  to: z.array(z.string().trim().email('Email is invalid')).optional(),
  cc: z.array(z.string().trim().email('Email is invalid')).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
});

function parseOrThrow(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data;

  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  throw ApiError.badRequest(result.error.issues[0]?.message ?? 'Please check the form', fields);
}

/* ------------------------------------------------------------------ */
/* GET /clients/:id/completion-certificate?dealId=...&download=1       */
/* ------------------------------------------------------------------ */

export const certificatePdf = asyncHandler(async (req, res) => {
  const input = parseOrThrow(certificateInputSchema, req.query);
  const document = await DocumentService.completionCertificatePdf(req.params.id, input, req.user);

  const download = ['1', 'true'].includes(String(req.query.download ?? ''));
  const filename = document.filename.replace(/"/g, '');

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Length': document.buffer.length,
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    'Cache-Control': 'no-store',
    'Access-Control-Expose-Headers': 'Content-Disposition, X-Verification-Code',
    ...(document.verificationCode ? { 'X-Verification-Code': document.verificationCode } : {}),
  });
  res.end(document.buffer);
});

/* ------------------------------------------------------------------ */
/* POST /clients/:id/completion-certificate/email                      */
/* ------------------------------------------------------------------ */

export const emailCertificate = asyncHandler(async (req, res) => {
  const emailSchema = emailValidators.emailSendSchema ?? emailValidators.welcomeEmailSchema ?? basicEmailSchema;
  const email = parseOrThrow(emailSchema, req.body);
  const certificate = parseOrThrow(certificateInputSchema, req.body);

  const result = await EmailService.emailCompletionCertificate(req.params.id, { ...email, ...certificate }, req.user);
  res.json(result);
});
