import { Router } from 'express';
import * as controller from '../controllers/reportController.js';
import { validate } from '../middleware/validate.js';
import { reportExportQuery, reportQuery } from '../validators/reportValidators.js';
import * as documents from '../controllers/documentController.js';
import { periodPdfQuery } from '../validators/documentValidators.js';
const router = Router();

router.get('/', validate({ query: reportQuery }), controller.show);
router.get('/export', validate({ query: reportExportQuery }), controller.exportCsv);

router.get('/pdf', validate({ query: periodPdfQuery }), documents.financialReportPdf);

export default router;