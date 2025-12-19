import { Router } from 'express';
import { body } from 'express-validator';
import patientController from '../controllers/patientController';
import { authenticate, requirePetugas } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get patient statistics
router.get('/stats', patientController.getPatientStats);

// Get all patients
router.get('/', patientController.getAllPatients);

// Get patient by ID
router.get('/:id', patientController.getPatientById);

// Get patient by NIK
router.get('/nik/:nik', patientController.getPatientByNik);

// Create patient
router.post(
  '/',
  requirePetugas,
  validate([
    body('nama').notEmpty().withMessage('Nama harus diisi'),
    // CHANGED: NIK is now optional
    body('nik')
      .optional({ checkFalsy: true })  // Allow empty string
      .isLength({ min: 16, max: 16 })
      .withMessage('NIK harus 16 digit jika diisi'),
    body('jenisKelamin')
      .isIn(['LAKI_LAKI', 'PEREMPUAN'])
      .withMessage('Jenis kelamin tidak valid'),
    body('tempatLahir').notEmpty().withMessage('Tempat lahir harus diisi'),
    body('tanggalLahir').isISO8601().withMessage('Tanggal lahir tidak valid'),
    body('alamat').notEmpty().withMessage('Alamat harus diisi'),
    // CHANGED: Agama is now optional
    body('agama')
      .optional({ checkFalsy: true })  // Allow empty string
      .isIn(['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA'])
      .withMessage('Agama tidak valid jika diisi'),
    // CHANGED: Pekerjaan is now optional (no validation needed, just remove the notEmpty)
    body('pekerjaan')
      .optional({ checkFalsy: true }),  // Allow empty string
    body('kelompokUsia')
      .isIn(['BALITA', 'ANAK', 'DEWASA', 'LANSIA', 'IBU_HAMIL'])
      .withMessage('Kelompok usia tidak valid'),
    body('usiaKehamilan')
      .optional()
      .isInt({ min: 1, max: 45 })
      .withMessage('Usia kehamilan tidak valid (1-45 minggu)'),
  ]),
  patientController.createPatient
);

// Update patient
router.put(
  '/:id',
  requirePetugas,
  validate([
    body('nama').optional().notEmpty().withMessage('Nama tidak boleh kosong'),
    body('nik')
      .optional({ checkFalsy: true })
      .isLength({ min: 16, max: 16 })
      .withMessage('NIK harus 16 digit jika diisi'),
    body('jenisKelamin')
      .optional()
      .isIn(['LAKI_LAKI', 'PEREMPUAN'])
      .withMessage('Jenis kelamin tidak valid'),
    body('agama')
      .optional({ checkFalsy: true })
      .isIn(['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA'])
      .withMessage('Agama tidak valid jika diisi'),
    body('pekerjaan')
      .optional({ checkFalsy: true }),
    body('kelompokUsia')
      .optional()
      .isIn(['BALITA', 'ANAK', 'DEWASA', 'LANSIA', 'IBU_HAMIL'])
      .withMessage('Kelompok usia tidak valid'),
  ]),
  patientController.updatePatient
);

// Delete patient
router.delete('/:id', requirePetugas, patientController.deletePatient);

export default router;