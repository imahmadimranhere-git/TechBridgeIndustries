import { Router } from 'express';
import * as controller from '../controllers/staffController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
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

export default router;