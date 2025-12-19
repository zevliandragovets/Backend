import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

// Get all patients
export const getAllPatients = asyncHandler(async (req: Request, res: Response) => {
  const { 
    page = '1', 
    limit = '10', 
    search = '', 
    kelompokUsia = '',
    jenisKelamin = '' 
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { nama: { contains: search as string, mode: 'insensitive' } },
      { nik: { contains: search as string, mode: 'insensitive' } },
      { alamat: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (kelompokUsia) {
    where.kelompokUsia = kelompokUsia;
  }

  if (jenisKelamin) {
    where.jenisKelamin = jenisKelamin;
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        createdByUser: {
          select: { nama: true },
        },
        _count: {
          select: {
            assessments: true,
            environments: true,
            needs: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.patient.count({ where }),
  ]);

  res.json({
    success: true,
    data: patients,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get patient by ID
export const getPatientById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      createdByUser: {
        select: { nama: true, jabatan: true },
      },
      assessments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      environments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      needs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!patient) {
    throw new ApiError(404, 'Pasien tidak ditemukan.');
  }

  res.json({
    success: true,
    data: patient,
  });
});

// Get patient by NIK
export const getPatientByNik = asyncHandler(async (req: Request, res: Response) => {
  const { nik } = req.params;

  const patient = await prisma.patient.findUnique({
    where: { nik },
    include: {
      createdByUser: {
        select: { nama: true },
      },
    },
  });

  if (!patient) {
    throw new ApiError(404, 'Pasien tidak ditemukan.');
  }

  res.json({
    success: true,
    data: patient,
  });
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const {
    nama,
    nik,
    jenisKelamin,
    tempatLahir,
    tanggalLahir,
    alamat,
    rt,
    rw,
    kelurahan,
    kecamatan,
    kabupaten,
    provinsi,
    agama,
    pekerjaan,
    noTelp,
    kelompokUsia,
    usiaKehamilan,
  } = req.body;

  // UPDATED: Basic validation - only nama is required
  if (!nama || nama.trim().length < 3) {
    throw new ApiError(400, 'Nama minimal 3 karakter');
  }
  
  // CHANGED: NIK validation only if provided
  if (nik) {
    if (nik.length !== 16) {
      throw new ApiError(400, 'NIK harus 16 digit');
    }
    
    if (!/^\d+$/.test(nik)) {
      throw new ApiError(400, 'NIK harus berupa angka');
    }
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // CHANGED: Check if NIK exists only if NIK is provided
    if (nik) {
      const existingPatient = await tx.patient.findUnique({ 
        where: { nik } 
      });
      
      if (existingPatient) {
        throw new ApiError(400, 'NIK sudah terdaftar');
      }
    }

    // Create patient
    const patient = await tx.patient.create({
      data: {
        nama,
        nik: nik || null,  // Allow null if not provided
        jenisKelamin,
        tempatLahir,
        tanggalLahir: new Date(tanggalLahir),
        alamat,
        rt,
        rw,
        kelurahan,
        kecamatan,
        kabupaten,
        provinsi,
        agama: agama || null,  // CHANGED: Allow null
        pekerjaan: pekerjaan || null,  // CHANGED: Allow null
        noTelp,
        kelompokUsia,
        usiaKehamilan: kelompokUsia === 'IBU_HAMIL' ? usiaKehamilan : null,
        createdBy: req.user!.userId,
      },
      include: {
        createdByUser: {
          select: { nama: true },
        },
      },
    });

    // Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_PATIENT',
        entity: 'Patient',
        entityId: patient.id,
        newData: patient,
      },
    });

    return patient;
  });

  res.status(201).json({
    success: true,
    message: 'Data pasien berhasil disimpan',
    data: result,
  });
});

// Update patient
export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const existingPatient = await prisma.patient.findUnique({ where: { id } });
  if (!existingPatient) {
    throw new ApiError(404, 'Pasien tidak ditemukan.');
  }

  // CHANGED: Check NIK uniqueness only if NIK is provided and changed
  if (updateData.nik && updateData.nik !== existingPatient.nik) {
    const nikExists = await prisma.patient.findUnique({ where: { nik: updateData.nik } });
    if (nikExists) {
      throw new ApiError(400, 'NIK sudah digunakan pasien lain.');
    }
  }

  // Handle date conversion
  if (updateData.tanggalLahir) {
    updateData.tanggalLahir = new Date(updateData.tanggalLahir);
  }

  // CHANGED: Convert empty strings to null for optional fields
  if (updateData.nik === '') updateData.nik = null;
  if (updateData.agama === '') updateData.agama = null;
  if (updateData.pekerjaan === '') updateData.pekerjaan = null;

  const patient = await prisma.patient.update({
    where: { id },
    data: updateData,
    include: {
      createdByUser: {
        select: { nama: true },
      },
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      entityId: id,
      oldData: existingPatient,
      newData: patient,
    },
  });

  res.json({
    success: true,
    message: 'Data pasien berhasil diperbarui.',
    data: patient,
  });
});

// Delete patient
export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    throw new ApiError(404, 'Pasien tidak ditemukan.');
  }

  await prisma.patient.delete({ where: { id } });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE_PATIENT',
      entity: 'Patient',
      entityId: id,
      oldData: patient,
    },
  });

  res.json({
    success: true,
    message: 'Data pasien berhasil dihapus.',
  });
});

// Get patient statistics
export const getPatientStats = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalPatients,
    byKelompokUsia,
    byJenisKelamin,
    todayPatients,
    thisWeekPatients,
    thisMonthPatients,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.groupBy({
      by: ['kelompokUsia'],
      _count: { kelompokUsia: true },
    }),
    prisma.patient.groupBy({
      by: ['jenisKelamin'],
      _count: { jenisKelamin: true },
    }),
    prisma.patient.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.patient.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.patient.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      total: totalPatients,
      byKelompokUsia: byKelompokUsia.reduce((acc: Record<string, number>, item: { kelompokUsia: string, _count: { kelompokUsia: number } }) => {
        acc[item.kelompokUsia] = item._count.kelompokUsia;
        return acc;
      }, {} as Record<string, number>),
      byJenisKelamin: byJenisKelamin.reduce((acc: Record<string, number>, item: { jenisKelamin: string, _count: { jenisKelamin: number } }) => {
        acc[item.jenisKelamin] = item._count.jenisKelamin;
        return acc;
      }, {} as Record<string, number>),
      todayPatients,
      thisWeekPatients,
      thisMonthPatients,
    },
  });
});

export default {
  getAllPatients,
  getPatientById,
  getPatientByNik,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientStats,
};