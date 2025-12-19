import { Router } from 'express';
import { body } from 'express-validator';
import needsController from '../controllers/needsController';
import { authenticate, requirePetugas } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get needs statistics
router.get('/stats', needsController.getNeedsStats);

// Get all needs
router.get('/', needsController.getAllNeeds);

// Get needs by ID
router.get('/:id', needsController.getNeedsById);

// Create needs
router.post(
  '/',
  requirePetugas,
  validate([
    body('patientId')
      .notEmpty()
      .withMessage('ID Pasien harus diisi')
      .isString()
      .withMessage('ID Pasien harus berupa string'),
    body('obatObatan')
      .optional()
      .custom((value) => {
        if (typeof value === 'string' || Array.isArray(value)) return true;
        throw new Error('Obat-obatan harus berupa string atau array');
      }),
    body('alatKesehatan')
      .optional()
      .custom((value) => {
        if (typeof value === 'string' || Array.isArray(value)) return true;
        throw new Error('Alat kesehatan harus berupa string atau array');
      }),
    body('infrastruktur')
      .optional()
      .custom((value) => {
        if (typeof value === 'string' || Array.isArray(value)) return true;
        throw new Error('Infrastruktur harus berupa string atau array');
      }),
    body('prioritasObat')
      .optional()
      .isIn(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'])
      .withMessage('Prioritas obat tidak valid'),
    body('prioritasAlat')
      .optional()
      .isIn(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'])
      .withMessage('Prioritas alat tidak valid'),
    body('prioritasInfrastruktur')
      .optional()
      .isIn(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'])
      .withMessage('Prioritas infrastruktur tidak valid'),
    body('keterangan')
      .optional()
      .isString()
      .withMessage('Keterangan harus berupa string'),
  ]),
  needsController.createNeeds
);

// Update needs
router.put(
  '/:id',
  requirePetugas,
  validate([
    body('obatObatan')
      .optional()
      .custom((value) => {
        if (typeof value === 'string' || Array.isArray(value)) return true;
        throw new Error('Obat-obatan harus berupa string atau array');
      }),
    body('alatKesehatan')
      .optional()
      .custom((value) => {
        if (typeof value === 'string' || Array.isArray(value)) return true;
        throw new Error('Alat kesehatan harus berupa string atau array');
      }),
    body('infrastruktur')
      .optional()
      .custom((value) => {
        if (typeof value === 'string' || Array.isArray(value)) return true;
        throw new Error('Infrastruktur harus berupa string atau array');
      }),
    body('prioritasObat')
      .optional()
      .isIn(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'])
      .withMessage('Prioritas obat tidak valid'),
    body('prioritasAlat')
      .optional()
      .isIn(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'])
      .withMessage('Prioritas alat tidak valid'),
    body('prioritasInfrastruktur')
      .optional()
      .isIn(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'])
      .withMessage('Prioritas infrastruktur tidak valid'),
    body('keterangan')
      .optional()
      .isString()
      .withMessage('Keterangan harus berupa string'),
  ]),
  needsController.updateNeeds
);

// Delete needs
router.delete('/:id', requirePetugas, needsController.deleteNeeds);

export default router;