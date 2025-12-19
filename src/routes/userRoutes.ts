import { Router } from 'express';
import { body } from 'express-validator';
import userController from '../controllers/userController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication and super admin role
router.use(authenticate, requireSuperAdmin);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Create user - Fixed validation to match backend field names
router.post(
  '/',
  validate([
    body('email')
      .isEmail()
      .withMessage('Email tidak valid')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password minimal 6 karakter'),
    body('nama')
      .notEmpty()
      .withMessage('Nama harus diisi')
      .trim(),
    body('role')
      .isIn(['SUPER_ADMIN', 'PETUGAS'])
      .withMessage('Role tidak valid'),
    body('nip')
      .optional()
      .trim(),
    body('noTelp')
      .optional()
      .trim(),
    body('jabatan')
      .optional()
      .trim(),
  ]),
  userController.createUser
);

// Update user - Fixed validation to match backend field names
router.put(
  '/:id',
  validate([
    body('nama')
      .optional()
      .notEmpty()
      .withMessage('Nama tidak boleh kosong')
      .trim(),
    body('role')
      .optional()
      .isIn(['SUPER_ADMIN', 'PETUGAS'])
      .withMessage('Role tidak valid'),
    body('nip')
      .optional()
      .trim(),
    body('noTelp')
      .optional()
      .trim(),
    body('jabatan')
      .optional()
      .trim(),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive harus berupa boolean'),
  ]),
  userController.updateUser
);

// Delete user
router.delete('/:id', userController.deleteUser);

// Reset user password
router.post(
  '/:id/reset-password',
  validate([
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password baru minimal 6 karakter'),
  ]),
  userController.resetUserPassword
);

export default router;