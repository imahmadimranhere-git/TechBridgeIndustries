import { Router } from 'express';
import { z } from 'zod';
import { branding, verifyDocument } from '../controllers/publicController.js';
import { verifyLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/branding', branding);
router.get(
  '/verify/:code',
  verifyLimiter,
  validate({ params: z.object({ code: z.string().trim().min(5).max(40) }) }),
  verifyDocument
);

export default router;