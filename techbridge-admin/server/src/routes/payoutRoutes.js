import { Router } from 'express';
import * as controller from '../controllers/staffController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { payoutListQuery } from '../validators/staffValidators.js';
import * as documents from '../controllers/documentController.js';
import { pdfQuery } from '../validators/documentValidators.js';
import * as email from '../controllers/emailController.js';
import { emailSendSchema } from '../validators/emailValidators.js';
const router = Router();

router.get('/', validate({ query: payoutListQuery }), controller.listPayouts);
router.delete('/:id', validate({ params: idParams }), controller.removePayout);

router.get('/:id/slip', validate({ params: idParams, query: pdfQuery }), documents.payoutSlipPdf);
router.post('/:id/email', validate({ params: idParams, body: emailSendSchema }), email.payoutSlip);

export default router;