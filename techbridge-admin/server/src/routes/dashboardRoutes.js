import { Router } from 'express';
import * as controller from '../controllers/dashboardController.js';
import { validate } from '../middleware/validate.js';
import { dateRangeQuery } from '../validators/common.js';

const router = Router();

router.get('/', validate({ query: dateRangeQuery }), controller.show);

export default router;