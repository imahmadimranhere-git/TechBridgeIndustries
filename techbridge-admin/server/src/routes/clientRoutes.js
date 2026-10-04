import { Router } from 'express';
import * as controller from '../controllers/clientController.js';
import { validate } from '../middleware/validate.js';
import { clientBodySchema, clientListQuery } from '../validators/clientValidators.js';
import { idParams } from '../validators/common.js';
import * as documents from '../controllers/documentController.js';
import { periodPdfQuery, welcomeLetterQuery } from '../validators/documentValidators.js';

const router = Router();

router.get('/', validate({ query: clientListQuery }), controller.list);
router.post('/', validate({ body: clientBodySchema }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.show);
router.put('/:id', validate({ params: idParams, body: clientBodySchema }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);
router.get('/:id/statement', validate({ params: idParams, query: periodPdfQuery }), documents.clientStatementPdf);
router.get('/:id/welcome-letter', validate({ params: idParams, query: welcomeLetterQuery }), documents.welcomeLetterPdf);
export default router;