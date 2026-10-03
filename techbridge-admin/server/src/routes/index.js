import { Router } from 'express';
import { health } from '../controllers/publicController.js';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './authRoutes.js';
import publicRoutes from './publicRoutes.js';

const router = Router();

/* ---------- Public (no login needed) ---------- */
router.get('/health', health);
router.use('/auth', authRoutes); // login is public; /me checks login itself
router.use('/public', publicRoutes);

/* ---------- Protected (admin login required) ---------- */
const adminRouter = Router();
adminRouter.use(requireAuth);

// Phase 9 registers every module here, e.g.:
// adminRouter.use('/clients', clientRoutes);

router.use(adminRouter);

export default router;