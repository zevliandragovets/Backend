import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateToken } from '../config/jwt';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

// Login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, 'Email atau password salah.');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Akun Anda telah dinonaktifkan. Hubungi administrator.');
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Email atau password salah.');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  res.json({
    success: true,
    message: 'Login berhasil.',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
        nip: user.nip,
        role: user.role,
        jabatan: user.jabatan,
        unitKerja: user.unitKerja,
        noTelp: user.noTelp,
        foto: user.foto,
      },
    },
  });
});

// Get current user profile
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nama: true,
      nip: true,
      role: true,
      jabatan: true,
      unitKerja: true,
      noTelp: true,
      foto: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User tidak ditemukan.');
  }

  res.json({
    success: true,
    data: user,
  });
});

// Update profile
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { nama, nip, jabatan, unitKerja, noTelp } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      nama,
      nip,
      jabatan,
      unitKerja,
      noTelp,
    },
    select: {
      id: true,
      email: true,
      nama: true,
      nip: true,
      role: true,
      jabatan: true,
      unitKerja: true,
      noTelp: true,
      foto: true,
    },
  });

  res.json({
    success: true,
    message: 'Profil berhasil diperbarui.',
    data: user,
  });
});

// Update password
export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, 'User tidak ditemukan.');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(400, 'Password saat ini tidak valid.');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  res.json({
    success: true,
    message: 'Password berhasil diperbarui.',
  });
});

// Update profile photo
export const updateProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!req.file) {
    throw new ApiError(400, 'File foto tidak ditemukan.');
  }

  const photoUrl = `/uploads/profiles/${req.file.filename}`;

  await prisma.user.update({
    where: { id: userId },
    data: { foto: photoUrl },
  });

  res.json({
    success: true,
    message: 'Foto profil berhasil diperbarui.',
    data: { foto: photoUrl },
  });
});

// Logout (just for logging purposes)
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  // Log audit
  if (userId) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }

  res.json({
    success: true,
    message: 'Logout berhasil.',
  });
});

export default {
  login,
  getProfile,
  updateProfile,
  updatePassword,
  updateProfilePhoto,
  logout,
};
