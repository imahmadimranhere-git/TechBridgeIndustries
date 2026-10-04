import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

let transporterPromise = null;
let usingTestInbox = false;

export const isUsingTestInbox = () => usingTestInbox;

async function createTransporter() {
  if (env.smtpConfigured) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for port 465, false for 587 (STARTTLS)
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      pool: true, // reuse connections when several emails are sent close together
      maxConnections: 3,
    });
  }

  if (env.isProduction) {
    throw new ApiError(503, 'Email is not set up yet. Add the SMTP settings in server/.env and restart the server.');
  }

  // Development without SMTP: a free Ethereal inbox (emails are captured, never delivered)
  const account = await nodemailer.createTestAccount();
  usingTestInbox = true;
  logger.warn('SMTP not configured: using a temporary Ethereal test inbox. Emails are NOT delivered.');
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
}

/** One shared transporter for the whole app (same idea as the PDF browser) */
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((err) => {
      transporterPromise = null;
      throw err;
    });
  }
  return transporterPromise;
}

function friendlyMailError(err) {
  const code = err?.code ?? '';
  if (code === 'EAUTH') {
    return 'The email server rejected the login. Check SMTP_USER and SMTP_PASS (for Gmail use an App Password).';
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(code)) {
    return 'Could not connect to the email server. Check SMTP_HOST, SMTP_PORT and SMTP_SECURE, and your internet.';
  }
  if (code === 'EENVELOPE') return 'The email server rejected the recipient address.';
  return `Email could not be sent: ${err?.message ?? 'unknown error'}`;
}

/**
 * Sends one email. Returns { messageId, previewUrl, accepted, rejected }.
 * previewUrl is only set for the Ethereal test inbox.
 */
export async function sendMail({ to, cc, subject, html, text, attachments = [] }) {
  const transporter = await getTransporter();
  try {
    const info = await transporter.sendMail({
      from: env.MAIL_FROM,
      to,
      cc: cc?.length ? cc : undefined,
      subject,
      html,
      text,
      attachments,
      // data: images (logo) become inline attachments, so Gmail/Outlook show them
      attachDataUrls: true,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    logger.info(`Email sent to ${[].concat(to).join(', ')}: "${subject}"`);
    if (previewUrl) logger.info(`Test inbox preview: ${previewUrl}`);

    return { messageId: info.messageId, previewUrl, accepted: info.accepted, rejected: info.rejected };
  } catch (err) {
    logger.error(`Email to ${[].concat(to).join(', ')} failed: ${err.message}`);
    throw new ApiError(502, friendlyMailError(err));
  }
}

export async function closeMail() {
  if (!transporterPromise) return;
  const transporter = await transporterPromise.catch(() => null);
  transporterPromise = null;
  transporter?.close();
}