import * as DocumentService from '../services/DocumentService.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * inline     -> the browser shows the PDF (Preview in a new tab / iframe)
 * attachment -> the browser saves it (Download)
 */
function sendPdf(res, { buffer, filename, verificationCode }, download) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Length': buffer.length,
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  if (verificationCode) res.set('X-Verification-Code', verificationCode);
  res.send(buffer);
}

export const invoicePdf = asyncHandler(async (req, res) => {
  sendPdf(res, await DocumentService.invoicePdf(req.params.id, req.user), req.validated.query.download);
});

export const receiptPdf = asyncHandler(async (req, res) => {
  sendPdf(res, await DocumentService.receiptPdf(req.params.id, req.user), req.validated.query.download);
});

export const clientStatementPdf = asyncHandler(async (req, res) => {
  const { download, ...range } = req.validated.query;
  sendPdf(res, await DocumentService.clientStatementPdf(req.params.id, range, req.user), download);
});

export const payoutSlipPdf = asyncHandler(async (req, res) => {
  sendPdf(res, await DocumentService.payoutSlipPdf(req.params.id, req.user), req.validated.query.download);
});

export const commissionStatementPdf = asyncHandler(async (req, res) => {
  const { download, ...range } = req.validated.query;
  sendPdf(res, await DocumentService.commissionStatementPdf(req.params.id, range, req.user), download);
});

export const welcomeLetterPdf = asyncHandler(async (req, res) => {
  const { download, dealId } = req.validated.query;
  const result = await DocumentService.welcomeLetterPdf(req.params.id, { dealId }, req.user);

  // A preview is not logged; a real download is
  if (download) {
    await DocumentService.recordWelcomeLetter({
      clientId: result.record._id,
      dealId: result.deal?._id ?? null,
      action: 'Downloaded',
      verificationCode: result.verificationCode,
      user: req.user,
    });
  }
  sendPdf(res, result, download);
});

export const financialReportPdf = asyncHandler(async (req, res) => {
  const { download, ...range } = req.validated.query;
  sendPdf(res, await DocumentService.financialReportPdf(range, req.user), download);
});