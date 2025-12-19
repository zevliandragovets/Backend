import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

// Get all users (Admin only)
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10', search = '', role = '' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { nama: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { nip: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get user by ID
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
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
      _count: {
        select: {
          patients: true,
          assessments: true,
        },
      },
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

// Create user (Admin only)
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, nama, nip, role, jabatan, unitKerja, noTelp } = req.body;

  // Check if email exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(400, 'Email sudah terdaftar.');
  }

  // Check if NIP exists (if provided)
  if (nip) {
    const existingNip = await prisma.user.findUnique({ where: { nip } });
    if (existingNip) {
      throw new ApiError(400, 'NIP sudah terdaftar.');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nama,
      nip,
      role,
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
      isActive: true,
      createdAt: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      newData: { email, nama, nip, role, jabatan, unitKerja },
    },
  });

  res.status(201).json({
    success: true,
    message: 'User berhasil dibuat.',
    data: user,
  });
});

// Update user (Admin only)
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nama, nip, role, jabatan, unitKerja, noTelp, isActive } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    throw new ApiError(404, 'User tidak ditemukan.');
  }

  // Check NIP uniqueness if changed
  if (nip && nip !== existingUser.nip) {
    const nipExists = await prisma.user.findUnique({ where: { nip } });
    if (nipExists) {
      throw new ApiError(400, 'NIP sudah digunakan user lain.');
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      nama,
      nip,
      role,
      jabatan,
      unitKerja,
      noTelp,
      isActive,
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
      isActive: true,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      oldData: existingUser,
      newData: user,
    },
  });

  res.json({
    success: true,
    message: 'User berhasil diperbarui.',
    data: user,
  });
});

// Delete user (Admin only)
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, 'User tidak ditemukan.');
  }

  // Don't allow deleting self
  if (id === req.user?.userId) {
    throw new ApiError(400, 'Anda tidak dapat menghapus akun sendiri.');
  }

  await prisma.user.delete({ where: { id } });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
      oldData: user,
    },
  });

  res.json({
    success: true,
    message: 'User berhasil dihapus.',
  });
});

// Reset user password (Admin only)
export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, 'User tidak ditemukan.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: id,
    },
  });

  res.json({
    success: true,
    message: 'Password user berhasil direset.',
  });
});

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
};
