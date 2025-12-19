// backend/src/controllers/disasterController.ts

import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

// Get all disasters with pagination and filters
export const getAllDisasters = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '10',
    search = '',
    jenisBencana = '',
    status = '',
    provinsi = '',
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { namaBencana: { contains: search as string, mode: 'insensitive' } },
      { lokasi: { contains: search as string, mode: 'insensitive' } },
      { deskripsi: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (jenisBencana) {
    where.jenisBencana = jenisBencana;
  }

  if (status) {
    where.status = status;
  }

  if (provinsi) {
    where.provinsi = { contains: provinsi as string, mode: 'insensitive' };
  }

  const [disasters, total] = await Promise.all([
    prisma.disasterEvent.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { tanggalKejadian: 'desc' },
    }),
    prisma.disasterEvent.count({ where }),
  ]);

  res.json({
    success: true,
    data: disasters,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get disaster by ID
export const getDisasterById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const disaster = await prisma.disasterEvent.findUnique({
    where: { id },
  });

  if (!disaster) {
    throw new ApiError(404, 'Data bencana tidak ditemukan.');
  }

  res.json({
    success: true,
    data: disaster,
  });
});

// Create new disaster
export const createDisaster = asyncHandler(async (req: Request, res: Response) => {
  const {
    namaBencana,
    jenisBencana,
    tanggalKejadian,
    lokasi,
    provinsi,
    kabupaten,
    kecamatan,
    deskripsi,
    status = 'AKTIF',
  } = req.body;

  const disaster = await prisma.disasterEvent.create({
    data: {
      namaBencana,
      jenisBencana,
      tanggalKejadian: new Date(tanggalKejadian),
      lokasi,
      provinsi,
      kabupaten,
      kecamatan: kecamatan || null,
      deskripsi: deskripsi || null,
      status,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE_DISASTER',
      entity: 'DisasterEvent',
      entityId: disaster.id,
      newData: disaster,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Data bencana berhasil ditambahkan',
    data: disaster,
  });
});

// Update disaster
export const updateDisaster = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  let updateData = req.body;

  const existingDisaster = await prisma.disasterEvent.findUnique({
    where: { id },
  });

  if (!existingDisaster) {
    throw new ApiError(404, 'Data bencana tidak ditemukan.');
  }

  // Handle optional fields
  const optionalFields = ['kecamatan', 'deskripsi'];
  optionalFields.forEach(field => {
    if (updateData[field] === '' || updateData[field] === null) {
      updateData[field] = null;
    }
  });

  // Convert date if present
  if (updateData.tanggalKejadian) {
    updateData.tanggalKejadian = new Date(updateData.tanggalKejadian);
  }

  // Remove undefined fields
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const disaster = await prisma.disasterEvent.update({
    where: { id },
    data: updateData,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE_DISASTER',
      entity: 'DisasterEvent',
      entityId: id,
      oldData: existingDisaster,
      newData: disaster,
    },
  });

  res.json({
    success: true,
    message: 'Data bencana berhasil diperbarui',
    data: disaster,
  });
});

// Update disaster status
export const updateDisasterStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const existingDisaster = await prisma.disasterEvent.findUnique({
    where: { id },
  });

  if (!existingDisaster) {
    throw new ApiError(404, 'Data bencana tidak ditemukan.');
  }

  const disaster = await prisma.disasterEvent.update({
    where: { id },
    data: { status },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE_DISASTER_STATUS',
      entity: 'DisasterEvent',
      entityId: id,
      oldData: existingDisaster,
      newData: disaster,
    },
  });

  res.json({
    success: true,
    message: `Status bencana berhasil diubah menjadi ${status}`,
    data: disaster,
  });
});

// Delete disaster
export const deleteDisaster = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const disaster = await prisma.disasterEvent.findUnique({
    where: { id },
  });

  if (!disaster) {
    throw new ApiError(404, 'Data bencana tidak ditemukan.');
  }

  await prisma.disasterEvent.delete({
    where: { id },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE_DISASTER',
      entity: 'DisasterEvent',
      entityId: id,
      oldData: disaster,
    },
  });

  res.json({
    success: true,
    message: 'Data bencana berhasil dihapus',
  });
});

// Get disaster statistics
export const getDisasterStats = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalDisasters,
    activeDisasters,
    completedDisasters,
    byJenisBencana,
    recentDisasters,
  ] = await Promise.all([
    prisma.disasterEvent.count(),
    prisma.disasterEvent.count({ where: { status: 'AKTIF' } }),
    prisma.disasterEvent.count({ where: { status: 'SELESAI' } }),
    prisma.disasterEvent.groupBy({
      by: ['jenisBencana'],
      _count: { jenisBencana: true },
    }),
    prisma.disasterEvent.findMany({
      take: 5,
      orderBy: { tanggalKejadian: 'desc' },
    }),
  ]);

  res.json({
    success: true,
    data: {
      total: totalDisasters,
      active: activeDisasters,
      completed: completedDisasters,
      byJenisBencana: byJenisBencana.reduce((acc: Record<string, number>, item) => {
        acc[item.jenisBencana] = item._count.jenisBencana;
        return acc;
      }, {}),
      recent: recentDisasters,
    },
  });
});

export default {
  getAllDisasters,
  getDisasterById,
  createDisaster,
  updateDisaster,
  updateDisasterStatus,
  deleteDisaster,
  getDisasterStats,
};