import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import patientRoutes from './patientRoutes';
import assessmentRoutes from './assessmentRoutes';
import environmentRoutes from './environmentRoutes';
import needsRoutes from './needsRoutes';
import dashboardRoutes from './dashboardRoutes';
import exportRoutes from './exportRoutes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/patients', patientRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/environments', environmentRoutes);
router.use('/needs', needsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/export', exportRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SIRANA-Indonesia API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
