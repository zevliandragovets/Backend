import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

// Interface for uploaded file
interface UploadedFile {
  filename: string;
  [key: string]: any;
}

// Get all environment assessments
export const getAllEnvironments = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10', patientId = '' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (patientId) {
    where.patientId = patientId;
  }

  const [environments, total] = await Promise.all([
    prisma.environmentAssessment.findMany({
      where,
      include: {
        patient: {
          select: {
            nama: true,
            nik: true,
            alamat: true,
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
    prisma.environmentAssessment.count({ where }),
  ]);

  res.json({
    success: true,
    data: environments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get environment by ID
export const getEnvironmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const environment = await prisma.environmentAssessment.findUnique({
    where: { id },
    include: {
      patient: true,
      createdByUser: {
        select: { nama: true, jabatan: true },
      },
    },
  });

  if (!environment) {
    throw new ApiError(404, 'Penilaian lingkungan tidak ditemukan.');
  }

  res.json({
    success: true,
    data: environment,
  });
});

// Create environment assessment
export const createEnvironment = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, aksesAirBersih, kondisiSanitasi, catatanLingkungan } = req.body;

  // Verify patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new ApiError(404, 'Pasien tidak ditemukan.');
  }

  // Handle uploaded photos
  let fotoTempatTinggal: string[] = [];
  if (req.files && Array.isArray(req.files)) {
    fotoTempatTinggal = req.files.map(
      (file: UploadedFile) => `/uploads/environments/${file.filename}`
    );
  }

  const environment = await prisma.environmentAssessment.create({
    data: {
      patientId,
      aksesAirBersih,
      kondisiSanitasi,
      fotoTempatTinggal,
      catatanLingkungan,
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
      action: 'CREATE_ENVIRONMENT',
      entity: 'EnvironmentAssessment',
      entityId: environment.id,
      newData: environment,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Penilaian kondisi lingkungan berhasil disimpan.',
    data: environment,
  });
});

// Update environment assessment
export const updateEnvironment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { aksesAirBersih, kondisiSanitasi, catatanLingkungan } = req.body;

  const existing = await prisma.environmentAssessment.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'Penilaian lingkungan tidak ditemukan.');
  }

  // Handle uploaded photos
  let fotoTempatTinggal = existing.fotoTempatTinggal;
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const newPhotos = req.files.map(
      (file: UploadedFile) => `/uploads/environments/${file.filename}`
    );
    fotoTempatTinggal = [...fotoTempatTinggal, ...newPhotos];
  }

  const environment = await prisma.environmentAssessment.update({
    where: { id },
    data: {
      aksesAirBersih,
      kondisiSanitasi,
      fotoTempatTinggal,
      catatanLingkungan,
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
      action: 'UPDATE_ENVIRONMENT',
      entity: 'EnvironmentAssessment',
      entityId: id,
      oldData: existing,
      newData: environment,
    },
  });

  res.json({
    success: true,
    message: 'Penilaian kondisi lingkungan berhasil diperbarui.',
    data: environment,
  });
});

// Delete environment assessment
export const deleteEnvironment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const environment = await prisma.environmentAssessment.findUnique({ where: { id } });
  if (!environment) {
    throw new ApiError(404, 'Penilaian lingkungan tidak ditemukan.');
  }

  await prisma.environmentAssessment.delete({ where: { id } });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE_ENVIRONMENT',
      entity: 'EnvironmentAssessment',
      entityId: id,
      oldData: environment,
    },
  });

  res.json({
    success: true,
    message: 'Penilaian lingkungan berhasil dihapus.',
  });
});

// Get environment statistics
export const getEnvironmentStats = asyncHandler(async (req: Request, res: Response) => {
  const [total, byAirBersih, bySanitasi] = await Promise.all([
    prisma.environmentAssessment.count(),
    prisma.environmentAssessment.groupBy({
      by: ['aksesAirBersih'],
      _count: { aksesAirBersih: true },
    }),
    prisma.environmentAssessment.groupBy({
      by: ['kondisiSanitasi'],
      _count: { kondisiSanitasi: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      byAirBersih: byAirBersih.reduce((acc: Record<string, number>, item: { aksesAirBersih: string, _count: { aksesAirBersih: number } }) => {
        acc[item.aksesAirBersih] = item._count.aksesAirBersih;
        return acc;
      }, {} as Record<string, number>),
      bySanitasi: bySanitasi.reduce((acc: Record<string, number>, item: { kondisiSanitasi: string, _count: { kondisiSanitasi: number } }) => {
        acc[item.kondisiSanitasi] = item._count.kondisiSanitasi;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

export default {
  getAllEnvironments,
  getEnvironmentById,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getEnvironmentStats,
};