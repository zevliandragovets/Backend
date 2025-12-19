import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import validate from '../middleware/validate';
import { uploadProfilePhoto } from '../config/multer';

const router = Router();

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password harus diisi'),
  ]),
  authController.login
);

// Get profile (authenticated)
router.get('/profile', authenticate, authController.getProfile);

// Update profile
router.put(
  '/profile',
  authenticate,
  validate([
    body('nama').optional().notEmpty().withMessage('Nama tidak boleh kosong'),
    body('nip').optional(),
    body('jabatan').optional(),
    body('unitKerja').optional(),
    body('noTelp').optional(),
  ]),
  authController.updateProfile
);

// Update password
router.put(
  '/password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Password saat ini harus diisi'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password baru minimal 6 karakter'),
  ]),
  authController.updatePassword
);

// Update profile photo
router.post(
  '/profile/photo',
  authenticate,
  (req, res, next) => {
    uploadProfilePhoto(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  authController.updateProfilePhoto
);

// Logout
router.post('/logout', authenticate, authController.logout);

export default router;
