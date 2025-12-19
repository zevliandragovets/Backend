import { Router } from 'express';
import dashboardController from '../controllers/dashboardController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard statistics (Admin only - full stats)
router.get('/stats', requireSuperAdmin, dashboardController.getDashboardStats);

// Get user-specific dashboard (for Petugas)
router.get('/user', dashboardController.getUserDashboard);

export default router;
