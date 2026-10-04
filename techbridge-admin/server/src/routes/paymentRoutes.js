import { Router } from 'express';
import * as controller from '../controllers/paymentController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { paymentBodySchema, paymentListQuery } from '../validators/paymentValidators.js';
import * as documents from '../controllers/documentController.js';
import { pdfQuery } from '../validators/documentValidators.js';

const router = Router();

router.get('/', validate({ query: paymentListQuery }), controller.list);
router.post('/', validate({ body: paymentBodySchema }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.show);
router.delete('/:id', validate({ params: idParams }), controller.remove);
router.get('/:id/receipt', validate({ params: idParams, query: pdfQuery }), documents.receiptPdf);

export default router;