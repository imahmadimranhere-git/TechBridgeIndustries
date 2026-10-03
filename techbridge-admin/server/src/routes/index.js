import { Router } from 'express';
import { health } from '../controllers/publicController.js';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './authRoutes.js';
import clientRoutes from './clientRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import dealRoutes from './dealRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import noteRoutes from './noteRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import payoutRoutes from './payoutRoutes.js';
import profileRoutes from './profileRoutes.js';
import publicRoutes from './publicRoutes.js';
import reportRoutes from './reportRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import staffRoutes from './staffRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

/* ---------- Public (no login needed) ---------- */
router.get('/health', health);
router.use('/auth', authRoutes); // login is public; /me checks login itself
router.use('/public', publicRoutes);

/* ---------- Protected (admin login required) ---------- */
const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.use('/dashboard', dashboardRoutes);
adminRouter.use('/clients', clientRoutes);
adminRouter.use('/staff', staffRoutes);
adminRouter.use('/payouts', payoutRoutes);
adminRouter.use('/deals', dealRoutes);
adminRouter.use('/payments', paymentRoutes);
adminRouter.use('/invoices', invoiceRoutes);
adminRouter.use('/notes', noteRoutes);
adminRouter.use('/reports', reportRoutes);
adminRouter.use('/users', userRoutes);
adminRouter.use('/profile', profileRoutes);
adminRouter.use('/settings', settingsRoutes);

router.use(adminRouter);

export default router;