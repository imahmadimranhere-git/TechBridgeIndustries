import { Router } from 'express';
import * as controller from '../controllers/reportController.js';
import { validate } from '../middleware/validate.js';
import { reportExportQuery, reportQuery } from '../validators/reportValidators.js';

const router = Router();

router.get('/', validate({ query: reportQuery }), controller.show);
router.get('/export', validate({ query: reportExportQuery }), controller.exportCsv);
// Phase 12: /pdf

export default router;