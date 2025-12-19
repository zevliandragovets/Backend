// backend/src/routes/disasterRoutes.ts

import { Router } from 'express';
import { body } from 'express-validator';
import disasterController from '../controllers/disasterController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get disaster statistics (all users can view)
router.get('/stats', disasterController.getDisasterStats);

// Get all disasters (all users can view)
router.get('/', disasterController.getAllDisasters);

// Get disaster by ID (all users can view)
router.get('/:id', disasterController.getDisasterById);

// Create disaster (Super Admin only)
router.post(
  '/',
  requireSuperAdmin,
  validate([
    body('namaBencana')
      .notEmpty()
      .withMessage('Nama bencana harus diisi')
      .isLength({ min: 3 })
      .withMessage('Nama bencana minimal 3 karakter'),
    body('jenisBencana')
      .isIn([
        'GEMPA_BUMI',
        'TSUNAMI',
        'BANJIR',
        'TANAH_LONGSOR',
        'GUNUNG_MELETUS',
        'KEBAKARAN',
        'ANGIN_TOPAN',
        'KEKERINGAN',
        'EPIDEMI',
        'LAINNYA'
      ])
      .withMessage('Jenis bencana tidak valid'),
    body('tanggalKejadian')
      .isISO8601()
      .withMessage('Format tanggal kejadian tidak valid'),
    body('lokasi')
      .notEmpty()
      .withMessage('Lokasi harus diisi'),
    body('provinsi')
      .notEmpty()
      .withMessage('Provinsi harus diisi'),
    body('kabupaten')
      .notEmpty()
      .withMessage('Kabupaten harus diisi'),
    body('kecamatan')
      .optional({ checkFalsy: true }),
    body('deskripsi')
      .optional({ checkFalsy: true }),
    body('status')
      .optional()
      .isIn(['AKTIF', 'SELESAI'])
      .withMessage('Status tidak valid'),
  ]),
  disasterController.createDisaster
);

// Update disaster (Super Admin only)
router.put(
  '/:id',
  requireSuperAdmin,
  validate([
    body('namaBencana')
      .optional()
      .notEmpty()
      .withMessage('Nama bencana tidak boleh kosong')
      .isLength({ min: 3 })
      .withMessage('Nama bencana minimal 3 karakter'),
    body('jenisBencana')
      .optional()
      .isIn([
        'GEMPA_BUMI',
        'TSUNAMI',
        'BANJIR',
        'TANAH_LONGSOR',
        'GUNUNG_MELETUS',
        'KEBAKARAN',
        'ANGIN_TOPAN',
        'KEKERINGAN',
        'EPIDEMI',
        'LAINNYA'
      ])
      .withMessage('Jenis bencana tidak valid'),
    body('tanggalKejadian')
      .optional()
      .isISO8601()
      .withMessage('Format tanggal kejadian tidak valid'),
    body('status')
      .optional()
      .isIn(['AKTIF', 'SELESAI'])
      .withMessage('Status tidak valid'),
  ]),
  disasterController.updateDisaster
);

// Delete disaster (Super Admin only)
router.delete('/:id', requireSuperAdmin, disasterController.deleteDisaster);

// Update disaster status (Super Admin only)
router.patch(
  '/:id/status',
  requireSuperAdmin,
  validate([
    body('status')
      .isIn(['AKTIF', 'SELESAI'])
      .withMessage('Status tidak valid'),
  ]),
  disasterController.updateDisasterStatus
);

export default router;