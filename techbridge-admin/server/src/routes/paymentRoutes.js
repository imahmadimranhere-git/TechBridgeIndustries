import { Router } from 'express';
import * as controller from '../controllers/paymentController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { paymentBodySchema, paymentListQuery } from '../validators/paymentValidators.js';

const router = Router();

router.get('/', validate({ query: paymentListQuery }), controller.list);
router.post('/', validate({ body: paymentBodySchema }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.show);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;