import { Router } from 'express';
import { health } from '../controllers/publicController.js';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './authRoutes.js';
import clientRoutes from './clientRoutes.js';
import dealRoutes from './dealRoutes.js';
import noteRoutes from './noteRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import payoutRoutes from './payoutRoutes.js';
import publicRoutes from './publicRoutes.js';
import staffRoutes from './staffRoutes.js';

const router = Router();

/* ---------- Public (no login needed) ---------- */
router.get('/health', health);
router.use('/auth', authRoutes); // login is public; /me checks login itself
router.use('/public', publicRoutes);

/* ---------- Protected (admin login required) ---------- */
const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.use('/clients', clientRoutes);
adminRouter.use('/staff', staffRoutes);
adminRouter.use('/payouts', payoutRoutes);
adminRouter.use('/deals', dealRoutes);
adminRouter.use('/payments', paymentRoutes);
adminRouter.use('/notes', noteRoutes);
// Phase 9B: invoices, dashboard, reports, users, profile, settings

router.use(adminRouter);

export default router;