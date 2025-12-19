import { Router } from 'express';
import exportController from '../controllers/exportController';
import { authenticate, requirePetugas } from '../middleware/auth';

const router = Router();

// Middleware untuk mendukung authentication dari query parameter (untuk mobile download)
const authenticateWithQuery = (req: any, res: any, next: any) => {
  // Cek jika ada token di query parameter (dari mobile)
  const queryToken = req.query.authToken;
  
  if (queryToken) {
    // Set token ke header agar middleware authenticate bisa membacanya
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  
  // Lanjut ke middleware authenticate biasa
  next();
};

// All routes require authentication
// Gunakan authenticateWithQuery terlebih dahulu sebelum authenticate
router.use(authenticateWithQuery, authenticate, requirePetugas);

// Export patients
router.get('/patients', exportController.exportPatients);

// Export medical assessments
router.get('/assessments', exportController.exportAssessments);

// Export environment assessments
router.get('/environments', exportController.exportEnvironments);

// Export needs identification
router.get('/needs', exportController.exportNeeds);

// Export comprehensive report (all data in one file with multiple sheets)
router.get('/comprehensive', exportController.exportComprehensiveReport);

export default router;