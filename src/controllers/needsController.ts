import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

// Get all needs identifications
export const getAllNeeds = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10', patientId = '', prioritasObat = '', prioritasAlat = '', prioritasInfrastruktur = '' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (patientId) {
    where.patientId = patientId;
  }

  if (prioritasObat) {
    where.prioritasObat = prioritasObat as string;
  }

  if (prioritasAlat) {
    where.prioritasAlat = prioritasAlat as string;
  }

  if (prioritasInfrastruktur) {
    where.prioritasInfrastruktur = prioritasInfrastruktur as string;
  }

  const [needs, total] = await Promise.all([
    prisma.needsIdentification.findMany({
      where,
      include: {
        patient: {
          select: {
            nama: true,
            nik: true,
            alamat: true,
            kelompokUsia: true,
          },
        },
        createdByUser: {
          select: { nama: true },
        },
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.needsIdentification.count({ where }),
  ]);

  res.json({
    success: true,
    data: needs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get needs by ID
export const getNeedsById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const needs = await prisma.needsIdentification.findUnique({
    where: { id },
    include: {
      patient: true,
      createdByUser: {
        select: { nama: true, jabatan: true },
      },
    },
  });

  if (!needs) {
    throw new ApiError(404, 'Identifikasi kebutuhan tidak ditemukan.');
  }

  res.json({
    success: true,
    data: needs,
  });
});

// Helper function to parse comma-separated string to array
const parseToArray = (value: string | undefined | null): string[] => {
  if (!value || value.trim() === '') return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

// Create needs identification
export const createNeeds = asyncHandler(async (req: Request, res: Response) => {
  const {
    patientId,
    obatObatan,
    alatKesehatan,
    infrastruktur,
    prioritasObat,
    prioritasAlat,
    prioritasInfrastruktur,
    keterangan,
  } = req.body;

  // Verify patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new ApiError(404, 'Pasien tidak ditemukan.');
  }

  // Convert strings to arrays if they're strings
  const obatArray = typeof obatObatan === 'string' ? parseToArray(obatObatan) : (obatObatan || []);
  const alatArray = typeof alatKesehatan === 'string' ? parseToArray(alatKesehatan) : (alatKesehatan || []);
  const infraArray = typeof infrastruktur === 'string' ? parseToArray(infrastruktur) : (infrastruktur || []);

  const needs = await prisma.needsIdentification.create({
    data: {
      patientId,
      obatObatan: obatArray,
      alatKesehatan: alatArray,
      infrastruktur: infraArray,
      prioritasObat: prioritasObat || 'SEDANG',
      prioritasAlat: prioritasAlat || 'SEDANG',
      prioritasInfrastruktur: prioritasInfrastruktur || 'SEDANG',
      keterangan: keterangan || null,
      createdBy: req.user!.userId,
    },
    include: {
      patient: {
        select: { nama: true, nik: true },
      },
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE_NEEDS',
      entity: 'NeedsIdentification',
      entityId: needs.id,
      newData: needs,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Identifikasi kebutuhan berhasil disimpan.',
    data: needs,
  });
});

// Update needs identification
export const updateNeeds = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    obatObatan, 
    alatKesehatan, 
    infrastruktur, 
    prioritasObat, 
    prioritasAlat, 
    prioritasInfrastruktur, 
    keterangan 
  } = req.body;

  const existing = await prisma.needsIdentification.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'Identifikasi kebutuhan tidak ditemukan.');
  }

  // Convert strings to arrays if they're strings
  const obatArray = typeof obatObatan === 'string' ? parseToArray(obatObatan) : obatObatan;
  const alatArray = typeof alatKesehatan === 'string' ? parseToArray(alatKesehatan) : alatKesehatan;
  const infraArray = typeof infrastruktur === 'string' ? parseToArray(infrastruktur) : infrastruktur;

  const needs = await prisma.needsIdentification.update({
    where: { id },
    data: {
      ...(obatArray !== undefined && { obatObatan: obatArray }),
      ...(alatArray !== undefined && { alatKesehatan: alatArray }),
      ...(infraArray !== undefined && { infrastruktur: infraArray }),
      ...(prioritasObat && { prioritasObat }),
      ...(prioritasAlat && { prioritasAlat }),
      ...(prioritasInfrastruktur && { prioritasInfrastruktur }),
      ...(keterangan !== undefined && { keterangan }),
    },
    include: {
      patient: {
        select: { nama: true, nik: true },
      },
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE_NEEDS',
      entity: 'NeedsIdentification',
      entityId: id,
      oldData: existing,
      newData: needs,
    },
  });

  res.json({
    success: true,
    message: 'Identifikasi kebutuhan berhasil diperbarui.',
    data: needs,
  });
});

// Delete needs identification
export const deleteNeeds = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const needs = await prisma.needsIdentification.findUnique({ where: { id } });
  if (!needs) {
    throw new ApiError(404, 'Identifikasi kebutuhan tidak ditemukan.');
  }

  await prisma.needsIdentification.delete({ where: { id } });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE_NEEDS',
      entity: 'NeedsIdentification',
      entityId: id,
      oldData: needs,
    },
  });

  res.json({
    success: true,
    message: 'Identifikasi kebutuhan berhasil dihapus.',
  });
});

// Get needs statistics
export const getNeedsStats = asyncHandler(async (req: Request, res: Response) => {
  const [total, byPrioritasObat, byPrioritasAlat, byPrioritasInfrastruktur, allNeeds] = await Promise.all([
    prisma.needsIdentification.count(),
    prisma.needsIdentification.groupBy({
      by: ['prioritasObat'],
      _count: { prioritasObat: true },
    }),
    prisma.needsIdentification.groupBy({
      by: ['prioritasAlat'],
      _count: { prioritasAlat: true },
    }),
    prisma.needsIdentification.groupBy({
      by: ['prioritasInfrastruktur'],
      _count: { prioritasInfrastruktur: true },
    }),
    prisma.needsIdentification.findMany({
      select: {
        obatObatan: true,
        alatKesehatan: true,
        infrastruktur: true,
      },
    }),
  ]);

  // Aggregate all needs items
  const obatObatanCount: Record<string, number> = {};
  const alatKesehatanCount: Record<string, number> = {};
  const infrastrukturCount: Record<string, number> = {};

  allNeeds.forEach((need: { obatObatan: string[], alatKesehatan: string[], infrastruktur: string[] }) => {
    need.obatObatan.forEach((item: string) => {
      obatObatanCount[item] = (obatObatanCount[item] || 0) + 1;
    });
    need.alatKesehatan.forEach((item: string) => {
      alatKesehatanCount[item] = (alatKesehatanCount[item] || 0) + 1;
    });
    need.infrastruktur.forEach((item: string) => {
      infrastrukturCount[item] = (infrastrukturCount[item] || 0) + 1;
    });
  });

  res.json({
    success: true,
    data: {
      total,
      byPrioritasObat: byPrioritasObat.reduce((acc: Record<string, number>, item) => {
        acc[item.prioritasObat] = item._count.prioritasObat;
        return acc;
      }, {}),
      byPrioritasAlat: byPrioritasAlat.reduce((acc: Record<string, number>, item) => {
        acc[item.prioritasAlat] = item._count.prioritasAlat;
        return acc;
      }, {}),
      byPrioritasInfrastruktur: byPrioritasInfrastruktur.reduce((acc: Record<string, number>, item) => {
        acc[item.prioritasInfrastruktur] = item._count.prioritasInfrastruktur;
        return acc;
      }, {}),
      topObatObatan: Object.entries(obatObatanCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      topAlatKesehatan: Object.entries(alatKesehatanCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      topInfrastruktur: Object.entries(infrastrukturCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
    },
  });
});

export default {
  getAllNeeds,
  getNeedsById,
  createNeeds,
  updateNeeds,
  deleteNeeds,
  getNeedsStats,
};