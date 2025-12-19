import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

interface TindakLanjutGroup {
  tindakLanjut: string;
  _count: { tindakLanjut: number };
}

interface AnamnesisTypeGroup {
  anamnesisType: string;
  _count: { anamnesisType: number };
}

interface DiagnosaGroup {
  diagnosaKerja: string;
  _count: { diagnosaKerja: number };
}

export const getAllAssessments = asyncHandler(async (req: Request, res: Response) => {
  const { 
    page = '1', 
    limit = '10', 
    patientId = '',
    tindakLanjut = '',
    startDate = '',
    endDate = '' 
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (patientId) {
    where.patientId = patientId;
  }

  if (tindakLanjut) {
    where.tindakLanjut = tindakLanjut;
  }

  if (startDate && endDate) {
    where.tanggalKunjungan = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  const [assessments, total] = await Promise.all([
    prisma.medicalAssessment.findMany({
      where,
      include: {
        patient: {
          select: {
            nama: true,
            nik: true,
            kelompokUsia: true,
            jenisKelamin: true,
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
    prisma.medicalAssessment.count({ where }),
  ]);

  res.json({
    success: true,
    data: assessments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get assessment by ID
export const getAssessmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const assessment = await prisma.medicalAssessment.findUnique({
    where: { id },
    include: {
      patient: true,
      createdByUser: {
        select: { nama: true, jabatan: true },
      },
    },
  });

  if (!assessment) {
    throw new ApiError(404, 'Assesmen tidak ditemukan.');
  }

  res.json({
    success: true,
    data: assessment,
  });
});

// Get assessments by patient
export const getAssessmentsByPatient = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;

  const assessments = await prisma.medicalAssessment.findMany({
    where: { patientId },
    include: {
      createdByUser: {
        select: { nama: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: assessments,
  });
});

export const createAssessment = asyncHandler(async (req: Request, res: Response) => {
  const {
    patientId,
    tanggalKunjungan,
    jamKunjungan,
    anamnesisType,
    keluhanUtama,
    riwayatPenyakitSekarang,
    riwayatAlergi,
    riwayatPenyakitTerdahulu,
    riwayatPenggunaanObat,
    gcsEye,
    gcsVerbal,
    gcsMotoric,
    keadaanUmum,
    tekananDarahSistolik,
    tekananDarahDiastolik,
    suhu,
    nadi,
    respirasi,
    beratBadan,
    tinggiBadan,
    kepala,
    mata,
    mulut,
    leher,
    thorax,
    cor,
    pulmo,
    abdomen,
    ekstremitas,
    anusGenitalia,
    pemeriksaanPenunjang,
    hasilPenunjang,
    diagnosaKerja,
    penatalaksanaan,
    tindakLanjut,
    rujukKe,
    alasanRujuk,
    kiePenerima,
    kieKeterangan,
    dokterPemeriksa,
  } = req.body;

  // Additional backend validation
  if (!keluhanUtama || keluhanUtama.trim().length < 5) {
    throw new ApiError(400, 'Keluhan utama minimal 5 karakter');
  }

  if (!keadaanUmum || keadaanUmum.trim().length === 0) {
    throw new ApiError(400, 'Keadaan umum wajib diisi');
  }

  if (!diagnosaKerja || diagnosaKerja.trim().length < 3) {
    throw new ApiError(400, 'Diagnosa kerja minimal 3 karakter');
  }

  if (!dokterPemeriksa || dokterPemeriksa.trim().length < 3) {
    throw new ApiError(400, 'Nama dokter pemeriksa minimal 3 karakter');
  }

  // Validate GCS ranges
  if (gcsEye && (gcsEye < 1 || gcsEye > 4)) {
    throw new ApiError(400, 'GCS Eye harus antara 1-4');
  }
  if (gcsVerbal && (gcsVerbal < 1 || gcsVerbal > 5)) {
    throw new ApiError(400, 'GCS Verbal harus antara 1-5');
  }
  if (gcsMotoric && (gcsMotoric < 1 || gcsMotoric > 6)) {
    throw new ApiError(400, 'GCS Motorik harus antara 1-6');
  }

  // Validate vital signs
  if (suhu && (suhu < 30 || suhu > 45)) {
    throw new ApiError(400, 'Suhu tubuh harus antara 30-45°C');
  }
  if (nadi && (nadi < 30 || nadi > 200)) {
    throw new ApiError(400, 'Nadi harus antara 30-200 x/menit');
  }
  if (respirasi && (respirasi < 8 || respirasi > 60)) {
    throw new ApiError(400, 'Respirasi harus antara 8-60 x/menit');
  }

  // Use transaction
  const result = await prisma.$transaction(async (tx) => {
    // Verify patient exists
    const patient = await tx.patient.findUnique({ 
      where: { id: patientId } 
    });
    
    if (!patient) {
      throw new ApiError(404, 'Pasien tidak ditemukan');
    }

    // Create assessment
    const assessment = await tx.medicalAssessment.create({
      data: {
        patientId,
        tanggalKunjungan: new Date(tanggalKunjungan),
        jamKunjungan,
        anamnesisType,
        keluhanUtama,
        riwayatPenyakitSekarang,
        riwayatAlergi,
        riwayatPenyakitTerdahulu,
        riwayatPenggunaanObat,
        gcsEye: gcsEye || 4,
        gcsVerbal: gcsVerbal || 5,
        gcsMotoric: gcsMotoric || 6,
        keadaanUmum: keadaanUmum || 'BAIK',
        tekananDarahSistolik,
        tekananDarahDiastolik,
        suhu,
        nadi,
        respirasi,
        beratBadan,
        tinggiBadan,
        kepala,
        mata,
        mulut,
        leher,
        thorax,
        cor,
        pulmo,
        abdomen,
        ekstremitas,
        anusGenitalia,
        pemeriksaanPenunjang: pemeriksaanPenunjang || 'TIDAK_ADA',
        hasilPenunjang,
        diagnosaKerja,
        penatalaksanaan,
        tindakLanjut: tindakLanjut || 'PULANG',
        rujukKe,
        alasanRujuk,
        kiePenerima: kiePenerima || 'PASIEN',
        kieKeterangan,
        dokterPemeriksa,
        createdBy: req.user!.userId,
      },
      include: {
        patient: {
          select: { nama: true, nik: true },
        },
      },
    });

    // Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_ASSESSMENT',
        entity: 'MedicalAssessment',
        entityId: assessment.id,
        newData: assessment,
      },
    });

    return assessment;
  });

  res.status(201).json({
    success: true,
    message: 'Assesmen medis berhasil disimpan',
    data: result,
  });
});

// Update assessment
export const updateAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const existingAssessment = await prisma.medicalAssessment.findUnique({ where: { id } });
  if (!existingAssessment) {
    throw new ApiError(404, 'Assesmen tidak ditemukan.');
  }

  // Handle date conversion
  if (updateData.tanggalKunjungan) {
    updateData.tanggalKunjungan = new Date(updateData.tanggalKunjungan);
  }

  const assessment = await prisma.medicalAssessment.update({
    where: { id },
    data: updateData,
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
      action: 'UPDATE_ASSESSMENT',
      entity: 'MedicalAssessment',
      entityId: id,
      oldData: existingAssessment,
      newData: assessment,
    },
  });

  res.json({
    success: true,
    message: 'Assesmen medis berhasil diperbarui.',
    data: assessment,
  });
});

// Delete assessment
export const deleteAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const assessment = await prisma.medicalAssessment.findUnique({ where: { id } });
  if (!assessment) {
    throw new ApiError(404, 'Assesmen tidak ditemukan.');
  }

  await prisma.medicalAssessment.delete({ where: { id } });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE_ASSESSMENT',
      entity: 'MedicalAssessment',
      entityId: id,
      oldData: assessment,
    },
  });

  res.json({
    success: true,
    message: 'Assesmen medis berhasil dihapus.',
  });
});

// Get assessment statistics
export const getAssessmentStats = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalAssessments,
    byTindakLanjut,
    byAnamnesisType,
    todayAssessments,
    thisWeekAssessments,
    thisMonthAssessments,
    topDiagnoses,
  ] = await Promise.all([
    prisma.medicalAssessment.count(),
    prisma.medicalAssessment.groupBy({
      by: ['tindakLanjut'],
      _count: { tindakLanjut: true },
    }),
    prisma.medicalAssessment.groupBy({
      by: ['anamnesisType'],
      _count: { anamnesisType: true },
    }),
    prisma.medicalAssessment.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.medicalAssessment.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.medicalAssessment.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
    }),
    prisma.medicalAssessment.groupBy({
      by: ['diagnosaKerja'],
      _count: { diagnosaKerja: true },
      orderBy: { _count: { diagnosaKerja: 'desc' } },
      take: 10,
    }),
  ]);

  res.json({
    success: true,
    data: {
      total: totalAssessments,
      byTindakLanjut: byTindakLanjut.reduce(
        (acc: Record<string, number>, item: TindakLanjutGroup) => {
          acc[item.tindakLanjut] = item._count.tindakLanjut;
          return acc;
        },
        {} as Record<string, number>
      ),
      byAnamnesisType: byAnamnesisType.reduce(
        (acc: Record<string, number>, item: AnamnesisTypeGroup) => {
          acc[item.anamnesisType] = item._count.anamnesisType;
          return acc;
        },
        {} as Record<string, number>
      ),
      todayAssessments,
      thisWeekAssessments,
      thisMonthAssessments,
      topDiagnoses: topDiagnoses.map((d: DiagnosaGroup) => ({
        diagnosa: d.diagnosaKerja,
        count: d._count.diagnosaKerja,
      })),
    },
  });
});

export default {
  getAllAssessments,
  getAssessmentById,
  getAssessmentsByPatient,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAssessmentStats,
};
