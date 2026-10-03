import { Router } from 'express';
import * as controller from '../controllers/dealController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { dealBodySchema, dealListQuery } from '../validators/dealValidators.js';

const router = Router();

router.get('/', validate({ query: dealListQuery }), controller.list);
router.post('/', validate({ body: dealBodySchema }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.show);
router.put('/:id', validate({ params: idParams, body: dealBodySchema }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;