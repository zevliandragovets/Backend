import { Router } from 'express';
import { body } from 'express-validator';
import assessmentController from '../controllers/assessmentController';
import { authenticate, requirePetugas } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get assessment statistics
router.get('/stats', assessmentController.getAssessmentStats);

// Get all assessments
router.get('/', assessmentController.getAllAssessments);

// Get assessment by ID
router.get('/:id', assessmentController.getAssessmentById);

// Get assessments by patient
router.get('/patient/:patientId', assessmentController.getAssessmentsByPatient);

// Create assessment
router.post(
  '/',
  requirePetugas,
  validate([
    body('patientId').notEmpty().withMessage('ID Pasien harus diisi'),
    body('tanggalKunjungan').isISO8601().withMessage('Tanggal kunjungan tidak valid'),
    body('jamKunjungan').notEmpty().withMessage('Jam kunjungan harus diisi'),
    body('anamnesisType')
      .isIn(['AUTO_ANAMNESIS', 'ALLO_ANAMNESIS'])
      .withMessage('Tipe anamnesis tidak valid'),
    body('keluhanUtama')
      .notEmpty().withMessage('Keluhan utama harus diisi')
      .isLength({ min: 5 }).withMessage('Keluhan utama minimal 5 karakter'),
    body('gcsEye')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('GCS Eye harus antara 1-4'),
    body('gcsVerbal')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('GCS Verbal harus antara 1-5'),
    body('gcsMotoric')
      .optional()
      .isInt({ min: 1, max: 6 })
      .withMessage('GCS Motorik harus antara 1-6'),
    body('keadaanUmum')
      .optional()
      .isIn(['BAIK', 'SEDANG', 'BURUK'])
      .withMessage('Keadaan umum tidak valid (harus: BAIK, SEDANG, atau BURUK)'),
    body('tekananDarahSistolik')
      .optional()
      .isInt({ min: 50, max: 250 })
      .withMessage('Tekanan darah sistolik tidak valid (50-250 mmHg)'),
    body('tekananDarahDiastolik')
      .optional()
      .isInt({ min: 30, max: 150 })
      .withMessage('Tekanan darah diastolik tidak valid (30-150 mmHg)'),
    body('suhu')
      .optional()
      .isFloat({ min: 30, max: 45 })
      .withMessage('Suhu tidak valid (30-45°C)'),
    body('nadi')
      .optional()
      .isInt({ min: 30, max: 200 })
      .withMessage('Nadi tidak valid (30-200 x/menit)'),
    body('respirasi')
      .optional()
      .isInt({ min: 8, max: 60 })
      .withMessage('Respirasi tidak valid (8-60 x/menit)'),
    body('beratBadan')
      .optional()
      .isFloat({ min: 0.1, max: 300 })
      .withMessage('Berat badan tidak valid (0.1-300 kg)'),
    body('tinggiBadan')
      .optional()
      .isFloat({ min: 10, max: 250 })
      .withMessage('Tinggi badan tidak valid (10-250 cm)'),
    body('pemeriksaanPenunjang')
      .optional()
      .isIn(['LAB', 'RONTGEN', 'CT_SCAN', 'LAIN_LAIN', 'TIDAK_ADA'])
      .withMessage('Pemeriksaan penunjang tidak valid'),
    body('diagnosaKerja')
      .notEmpty().withMessage('Diagnosa kerja harus diisi')
      .isLength({ min: 3 }).withMessage('Diagnosa kerja minimal 3 karakter'),
    body('tindakLanjut')
      .optional()
      .isIn(['PULANG', 'RUJUK', 'TIDAK_RUJUK'])
      .withMessage('Tindak lanjut tidak valid'),
    body('kiePenerima')
      .optional()
      .isIn(['PASIEN', 'KELUARGA_PASIEN'])
      .withMessage('Penerima KIE tidak valid'),
    body('dokterPemeriksa')
      .notEmpty().withMessage('Nama dokter pemeriksa harus diisi')
      .isLength({ min: 3 }).withMessage('Nama dokter pemeriksa minimal 3 karakter'),
  ]),
  assessmentController.createAssessment
);

// Update assessment
router.put(
  '/:id',
  requirePetugas,
  validate([
    body('anamnesisType')
      .optional()
      .isIn(['AUTO_ANAMNESIS', 'ALLO_ANAMNESIS'])
      .withMessage('Tipe anamnesis tidak valid'),
    body('gcsEye')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('GCS Eye harus antara 1-4'),
    body('gcsVerbal')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('GCS Verbal harus antara 1-5'),
    body('gcsMotoric')
      .optional()
      .isInt({ min: 1, max: 6 })
      .withMessage('GCS Motorik harus antara 1-6'),
    body('keadaanUmum')
      .optional()
      .isIn(['BAIK', 'SEDANG', 'BURUK'])
      .withMessage('Keadaan umum tidak valid'),
    body('tekananDarahSistolik')
      .optional()
      .isInt({ min: 50, max: 250 })
      .withMessage('Tekanan darah sistolik tidak valid'),
    body('tekananDarahDiastolik')
      .optional()
      .isInt({ min: 30, max: 150 })
      .withMessage('Tekanan darah diastolik tidak valid'),
    body('pemeriksaanPenunjang')
      .optional()
      .isIn(['LAB', 'RONTGEN', 'CT_SCAN', 'LAIN_LAIN', 'TIDAK_ADA'])
      .withMessage('Pemeriksaan penunjang tidak valid'),
    body('tindakLanjut')
      .optional()
      .isIn(['PULANG', 'RUJUK', 'TIDAK_RUJUK'])
      .withMessage('Tindak lanjut tidak valid'),
    body('kiePenerima')
      .optional()
      .isIn(['PASIEN', 'KELUARGA_PASIEN'])
      .withMessage('Penerima KIE tidak valid'),
  ]),
  assessmentController.updateAssessment
);

// Delete assessment
router.delete('/:id', requirePetugas, assessmentController.deleteAssessment);

export default router;