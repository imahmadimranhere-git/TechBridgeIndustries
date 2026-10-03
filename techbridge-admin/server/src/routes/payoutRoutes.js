import { Router } from 'express';
import * as controller from '../controllers/staffController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { payoutListQuery } from '../validators/staffValidators.js';

const router = Router();

router.get('/', validate({ query: payoutListQuery }), controller.listPayouts);
router.delete('/:id', validate({ params: idParams }), controller.removePayout);

export default router;