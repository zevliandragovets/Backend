import { Router } from 'express';
import { body } from 'express-validator';
import environmentController from '../controllers/environmentController';
import { authenticate, requirePetugas } from '../middleware/auth';
import validate from '../middleware/validate';
import { uploadEnvironmentPhotos } from '../config/multer';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get environment statistics
router.get('/stats', environmentController.getEnvironmentStats);

// Get all environment assessments
router.get('/', environmentController.getAllEnvironments);

// Get environment by ID
router.get('/:id', environmentController.getEnvironmentById);

// Create environment assessment
router.post(
  '/',
  requirePetugas,
  (req, res, next) => {
    uploadEnvironmentPhotos(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  validate([
    body('patientId').notEmpty().withMessage('ID Pasien harus diisi'),
    body('aksesAirBersih')
      .isIn(['ADA', 'TIDAK_ADA'])
      .withMessage('Akses air bersih tidak valid'),
    body('kondisiSanitasi')
      .isIn(['BAIK', 'BURUK'])
      .withMessage('Kondisi sanitasi tidak valid'),
  ]),
  environmentController.createEnvironment
);

// Update environment assessment
router.put(
  '/:id',
  requirePetugas,
  (req, res, next) => {
    uploadEnvironmentPhotos(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  validate([
    body('aksesAirBersih')
      .optional()
      .isIn(['ADA', 'TIDAK_ADA'])
      .withMessage('Akses air bersih tidak valid'),
    body('kondisiSanitasi')
      .optional()
      .isIn(['BAIK', 'BURUK'])
      .withMessage('Kondisi sanitasi tidak valid'),
  ]),
  environmentController.updateEnvironment
);

// Delete environment assessment
router.delete('/:id', requirePetugas, environmentController.deleteEnvironment);

export default router;
