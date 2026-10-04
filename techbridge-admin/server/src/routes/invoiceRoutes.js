import { Router } from 'express';
import * as controller from '../controllers/invoiceController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { invoiceBodySchema, invoiceListQuery } from '../validators/invoiceValidators.js';
import * as documents from '../controllers/documentController.js';
import { pdfQuery } from '../validators/documentValidators.js';
import * as email from '../controllers/emailController.js';
import { emailSendSchema } from '../validators/emailValidators.js';
const router = Router();

router.get('/', validate({ query: invoiceListQuery }), controller.list);
router.post('/', validate({ body: invoiceBodySchema }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.show);
router.put('/:id', validate({ params: idParams, body: invoiceBodySchema }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);
router.post('/:id/duplicate', validate({ params: idParams }), controller.duplicate);
router.post('/:id/mark-sent', validate({ params: idParams }), controller.markSent);
router.get('/:id/pdf', validate({ params: idParams, query: pdfQuery }), documents.invoicePdf);
router.post('/:id/email', validate({ params: idParams, body: emailSendSchema }), email.invoice);

export default router;