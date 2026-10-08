import { Router } from 'express';
import * as completionController from '../controllers/completionController.js';

/**
 * Project Completion Certificate routes.
 * Mounted inside clientRoutes.js (router.use(completionRoutes)), so they are
 * protected by the same login check as every other /clients route:
 *   GET  /api/clients/:id/completion-certificate?dealId=...
 *   POST /api/clients/:id/completion-certificate/email
 */
const router = Router({ mergeParams: true });

// Safety net: never create a document without a logged-in admin
function requireUser(req, _res, next) {
  if (!req.user) {
    const error = new Error('Please log in again');
    error.statusCode = 401;
    error.status = 401;
    return next(error);
  }
  return next();
}

router.get('/:id/completion-certificate', requireUser, completionController.certificatePdf);
router.post('/:id/completion-certificate/email', requireUser, completionController.emailCertificate);

export default router;
