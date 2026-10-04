import { Router } from 'express';
import * as controller from '../controllers/staffController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import * as documents from '../controllers/documentController.js';
import { periodPdfQuery } from '../validators/documentValidators.js';
import * as email from '../controllers/emailController.js';
import { periodEmailSchema } from '../validators/emailValidators.js';

import {
  payoutBodySchema,
  staffBodySchema,
  staffListQuery,
  staffProfileQuery,
} from '../validators/staffValidators.js';

const router = Router();

router.get('/', validate({ query: staffListQuery }), controller.list);
router.post('/', validate({ body: staffBodySchema }), controller.create);
router.get('/:id', validate({ params: idParams, query: staffProfileQuery }), controller.show);
router.put('/:id', validate({ params: idParams, body: staffBodySchema }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);
router.post('/:id/payouts', validate({ params: idParams, body: payoutBodySchema }), controller.createPayout);
router.get('/:id/commission-statement', validate({ params: idParams, query: periodPdfQuery }), documents.commissionStatementPdf);
router.post('/:id/commission-statement/email', validate({ params: idParams, body: periodEmailSchema }), email.commissionStatement);

export default router;