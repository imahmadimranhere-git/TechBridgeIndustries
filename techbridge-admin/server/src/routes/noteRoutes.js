import { Router } from 'express';
import * as controller from '../controllers/noteController.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { noteCreateSchema, noteListQuery, noteUpdateSchema } from '../validators/noteValidators.js';

const router = Router();

router.get('/', validate({ query: noteListQuery }), controller.list);
router.post('/', validate({ body: noteCreateSchema }), controller.create);
router.put('/:id', validate({ params: idParams, body: noteUpdateSchema }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;