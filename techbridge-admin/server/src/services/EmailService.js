import { format } from 'date-fns';
import { INVOICE_STATUS } from '../config/constants.js';
import { Invoice } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { resolveDateRange } from '../utils/dateRanges.js';
import { htmlToText } from '../utils/htmlToText.js';
import { formatMoney } from '../utils/money.js';
import { getDocumentBranding } from './BrandingService.js';
import * as DocumentService from './DocumentService.js';
import FinanceService from './FinanceService.js';
import * as InvoiceService from './InvoiceService.js';
import { isUsingTestInbox, sendMail } from './MailService.js';
import { getSettings } from './SettingsService.js';
import { getLeadershipContacts } from './SignatoryService.js';
import { renderEmail } from './TemplateService.js';
import { verificationUrl } from './VerificationService.js';

const formatDay = (value) => (value ? format(new Date(value), 'dd MMM yyyy') : '');

async function moneyFormatter() {
  const { currencySymbol } = await getSettings();
  return (value) => formatMoney(value ?? 0, { symbol: currencySymbol });
}

// Address typed by the admin wins; otherwise the record's own email
function recipients(inputTo, fallbackEmail, who) {
  if (inputTo?.length) return inputTo;
  if (fallbackEmail) return [fallbackEmail];
  throw ApiError.badRequest(`${who} has no email address. Enter an address to send to.`, {
    to: 'Email address is required',
  });
}

const verificationContext = (code) => (code ? { code, url: verificationUrl(code) } : null);

/** Renders the branded email and sends it, with the PDF attached when given */
async function deliver({ template = 'document', to, cc, subject, context, document, user }) {
  const [branding, contacts] = await Promise.all([getDocumentBranding(), getLeadershipContacts(user?._id)]);

  const html = await renderEmail(template, {
    ...context,
    subject,
    branding,
    sender: user ? { name: user.name, designation: user.designation } : null,
    // All founders under the sign-off (only when there is more than one)
    team: contacts.length > 1 ? contacts : [],
    year: new Date().getFullYear(),
  });

  const attachments = document
    ? [{ filename: document.filename, content: document.buffer, contentType: 'application/pdf' }]
    : [];

  const result = await sendMail({ to, cc, subject, html, text: htmlToText(html), attachments });

  return {
    message: `Email sent to ${to.join(', ')}${isUsingTestInbox() ? ' (test inbox, not delivered)' : ''}`,
    to,
    cc: cc ?? [],
    subject,
    previewUrl: result.previewUrl,
    verificationCode: document?.verificationCode ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Invoice                                                             */
/* ------------------------------------------------------------------ */

export async function emailInvoice(invoiceId, input, user) {
  const current = await InvoiceService.findInvoiceOrThrow(invoiceId);
  const wasDraft = current.status === INVOICE_STATUS.DRAFT;

  // Mark as sent BEFORE rendering, so the attached PDF has no DRAFT watermark
  if (wasDraft) await InvoiceService.markAsSent(current._id);

  try {
    const document = await DocumentService.invoicePdf(current._id, user);
    const invoice = document.record;
    const money = await moneyFormatter();
    const { companyName } = await getSettings();
    const balance = Math.max(invoice.total - invoice.amountPaid, 0);

    return await deliver({
      to: recipients(input.to, invoice.client?.email, 'This client'),
      cc: input.cc,
      subject: input.subject || `Invoice ${invoice.invoiceNumber} from ${companyName}`,
      document,
      user,
      context: {
        heading: `Invoice ${invoice.invoiceNumber}`,
        greetingName: invoice.client?.name,
        intro: [
          `Please find attached invoice ${invoice.invoiceNumber}${invoice.deal?.title ? ` for ${invoice.deal.title}` : ''}.`,
          balance > 0
            ? `The balance due is ${money(balance)}, payable by ${formatDay(invoice.dueDate)}.`
            : 'This invoice has been paid in full. Thank you for your payment.',
        ],
        message: input.message,
        rows: [
          { label: 'Invoice number', value: invoice.invoiceNumber },
          { label: 'Invoice date', value: formatDay(invoice.invoiceDate) },
          { label: 'Due date', value: formatDay(invoice.dueDate) },
          { label: 'Total', value: money(invoice.total) },
          { label: 'Paid', value: money(invoice.amountPaid) },
          { label: 'Balance due', value: money(balance) },
        ],
        verification: verificationContext(document.verificationCode),
        attachmentName: document.filename,
      },
    });
  } catch (err) {
    // The email failed: put the invoice back to Draft so nothing looks "sent" by mistake
    if (wasDraft) await Invoice.updateOne({ _id: current._id }, { status: INVOICE_STATUS.DRAFT, sentAt: null });
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Payment receipt                                                     */
/* ------------------------------------------------------------------ */

export async function emailReceipt(paymentId, input, user) {
  const document = await DocumentService.receiptPdf(paymentId, user);
  const payment = document.record;
  const money = await moneyFormatter();
  const { companyName } = await getSettings();
  const deal = payment.deal ? await FinanceService.getDealFinancial(payment.deal._id).catch(() => null) : null;

  return deliver({
    to: recipients(input.to, payment.client?.email, 'This client'),
    cc: input.cc,
    subject: input.subject || `Payment receipt ${document.number} from ${companyName}`,
    document,
    user,
    context: {
      heading: 'Payment received, thank you',
      greetingName: payment.client?.name,
      intro: [
        `We have received your payment of ${money(payment.amount)}${deal ? ` for ${deal.title}` : ''}. Your receipt is attached.`,
      ],
      message: input.message,
      rows: [
        { label: 'Receipt number', value: document.number },
        { label: 'Payment date', value: formatDay(payment.date) },
        { label: 'Amount received', value: money(payment.amount) },
        { label: 'Method', value: payment.method },
        ...(deal ? [{ label: 'Remaining on project', value: money(deal.remaining) }] : []),
      ],
      verification: verificationContext(document.verificationCode),
      attachmentName: document.filename,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Client statement                                                    */
/* ------------------------------------------------------------------ */

export async function emailClientStatement(clientId, input, user) {
  const { range, from, to: rangeTo } = input;
  const document = await DocumentService.clientStatementPdf(clientId, { range, from, to: rangeTo }, user);
  const client = document.record;
  const period = resolveDateRange({ range, from, to: rangeTo });
  const summary = await FinanceService.getSummary({ clientId: client._id, to: period.to });
  const money = await moneyFormatter();
  const { companyName } = await getSettings();

  return deliver({
    to: recipients(input.to, client.email, 'This client'),
    cc: input.cc,
    subject: input.subject || `Account statement (${period.label}) from ${companyName}`,
    document,
    user,
    context: {
      heading: 'Your account statement',
      greetingName: client.name,
      intro: [`Please find attached your account statement for ${period.label}.`],
      message: input.message,
      rows: [
        { label: 'Period', value: period.label },
        { label: 'Total project value', value: money(summary.totalDealValue) },
        { label: 'Total received', value: money(summary.totalReceived) },
        { label: 'Remaining balance', value: money(summary.remainingFromClients) },
      ],
      verification: verificationContext(document.verificationCode),
      attachmentName: document.filename,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Welcome letter (every attempt is logged, success or failure)        */
/* ------------------------------------------------------------------ */

export async function emailWelcomeLetter(clientId, input, user) {
  const document = await DocumentService.welcomeLetterPdf(clientId, { dealId: input.dealId }, user);
  const client = document.record;
  const money = await moneyFormatter();
  const { companyName } = await getSettings();
  const to = recipients(input.to, client.email, 'This client');
  const subject = input.subject || `Welcome to ${companyName}`;

  const log = {
    clientId: client._id,
    dealId: document.deal?._id ?? null,
    action: 'Emailed',
    sentTo: to.join(', '),
    subject,
    verificationCode: document.verificationCode,
    user,
  };

  try {
    const result = await deliver({
      to,
      cc: input.cc,
      subject,
      document,
      user,
      context: {
        heading: `Welcome to ${companyName}`,
        greetingName: client.name,
        intro: [
          `Thank you for choosing ${companyName}. We are delighted to have ${client.companyName || 'you'} on board.`,
          'Your welcome letter is attached with everything you need to get started.',
        ],
        message: input.message,
        rows: document.deal
          ? [
              { label: 'Project', value: document.deal.title },
              { label: 'Agreed amount', value: money(document.deal.dealAmount) },
            ]
          : [],
        verification: verificationContext(document.verificationCode),
        attachmentName: document.filename,
      },
    });
    await DocumentService.recordWelcomeLetter({ ...log, status: 'Success' });
    return result;
  } catch (err) {
    await DocumentService.recordWelcomeLetter({ ...log, status: 'Failed', errorMessage: err.message }).catch(() => {});
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Project completion certificate                                      */
/* ------------------------------------------------------------------ */

export async function emailCompletionCertificate(clientId, input, user) {
  const document = await DocumentService.completionCertificatePdf(
    clientId,
    { dealId: input.dealId, deliveredOn: input.deliveredOn, deliverables: input.deliverables },
    user
  );
  const client = document.record;
  const { companyName } = await getSettings();

  return deliver({
    to: recipients(input.to, client.email, 'This client'),
    cc: input.cc,
    subject: input.subject || `Your project "${document.deal.title}" has been delivered - ${companyName}`,
    document,
    user,
    context: {
      heading: 'Your project has been delivered',
      greetingName: client.name,
      intro: [
        `We are delighted to confirm that ${document.deal.title} has been successfully completed and delivered.`,
        `Thank you for trusting ${companyName} with your project. Your Project Completion Certificate is attached as a record of this milestone.`,
        'Whenever you need support, updates or a new project, we are only one message away.',
      ],
      message: input.message,
      rows: [
        { label: 'Project', value: document.deal.title },
        { label: 'Delivered on', value: formatDay(document.deliveredOn) },
        { label: 'Certificate number', value: document.number },
      ],
      verification: verificationContext(document.verificationCode),
      attachmentName: document.filename,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Commission payout slip                                              */
/* ------------------------------------------------------------------ */

export async function emailPayoutSlip(payoutId, input, user) {
  const document = await DocumentService.payoutSlipPdf(payoutId, user);
  const payout = document.record;
  const money = await moneyFormatter();
  const { companyName } = await getSettings();

  return deliver({
    to: recipients(input.to, payout.staff?.email, 'This staff member'),
    cc: input.cc,
    subject: input.subject || `Commission payout ${document.number} from ${companyName}`,
    document,
    user,
    context: {
      heading: 'Commission paid',
      greetingName: payout.staff?.name,
      intro: [`Your commission payout of ${money(payout.amount)} has been made. The payout slip is attached.`],
      message: input.message,
      rows: [
        { label: 'Slip number', value: document.number },
        { label: 'Date', value: formatDay(payout.date) },
        { label: 'Amount', value: money(payout.amount) },
        { label: 'Method', value: payout.method },
        ...(payout.reference ? [{ label: 'Reference', value: payout.reference }] : []),
      ],
      verification: verificationContext(document.verificationCode),
      attachmentName: document.filename,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Commission statement                                                */
/* ------------------------------------------------------------------ */

export async function emailCommissionStatement(staffId, input, user) {
  const { range, from, to: rangeTo } = input;
  const document = await DocumentService.commissionStatementPdf(staffId, { range, from, to: rangeTo }, user);
  const staff = document.record;
  const period = resolveDateRange({ range, from, to: rangeTo });
  const [[inPeriod], [overall]] = await Promise.all([
    FinanceService.getStaffFinancials({ from: period.from, to: period.to }, { staffIds: [staff._id] }),
    FinanceService.getStaffFinancials({}, { staffIds: [staff._id] }),
  ]);
  const money = await moneyFormatter();
  const { companyName } = await getSettings();

  return deliver({
    to: recipients(input.to, staff.email, 'This staff member'),
    cc: input.cc,
    subject: input.subject || `Commission statement (${period.label}) from ${companyName}`,
    document,
    user,
    context: {
      heading: 'Your commission statement',
      greetingName: staff.name,
      intro: [`Please find attached your commission statement for ${period.label}.`],
      message: input.message,
      rows: [
        { label: 'Period', value: period.label },
        { label: 'Earned in period', value: money(inPeriod?.commissionEarned) },
        { label: 'Paid in period', value: money(inPeriod?.commissionPaid) },
        { label: 'Pending (overall)', value: money(overall?.commissionPending) },
      ],
      verification: verificationContext(document.verificationCode),
      attachmentName: document.filename,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Settings: test email                                                */
/* ------------------------------------------------------------------ */

export function sendTestEmail(to, user) {
  return deliver({
    template: 'test',
    to: [to],
    subject: 'Test email from the admin panel',
    user,
    context: { sentAt: new Date() },
  });
}
