import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { KelompokUsia, JenisKelamin, TindakLanjut, AksesAirBersih, KondisiSanitasi } from '@prisma/client';

type KelompokUsiaGroup = {
  kelompokUsia: KelompokUsia;
  _count: { kelompokUsia: number };
};

type JenisKelaminGroup = {
  jenisKelamin: JenisKelamin;
  _count: { jenisKelamin: number };
};

type TindakLanjutGroup = {
  tindakLanjut: TindakLanjut;
  _count: { tindakLanjut: number };
};

type AksesAirBersihGroup = {
  aksesAirBersih: AksesAirBersih;
  _count: { aksesAirBersih: number };
};

type KondisiSanitasiGroup = {
  kondisiSanitasi: KondisiSanitasi;
  _count: { kondisiSanitasi: number };
};

type DiagnosaGroup = {
  diagnosaKerja: string;
  _count: { diagnosaKerja: number };
};

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    // Total counts
    totalPatients,
    totalAssessments,
    totalEnvironments,
    totalNeeds,
    totalUsers,
    
    // Today's counts
    todayPatients,
    todayAssessments,
    
    // This week's counts
    weekPatients,
    weekAssessments,
    
    // This month's counts
    monthPatients,
    monthAssessments,
    
    // Group by statistics
    patientsByKelompokUsia,
    patientsByJenisKelamin,
    assessmentsByTindakLanjut,
    environmentByAirBersih,
    environmentBySanitasi,
    
    // Recent data
    recentPatients,
    recentAssessments,
    
    // Active disasters
    activeDisasters,
    
    // Top diagnoses
    topDiagnoses,
  ] = await Promise.all([
    // Total counts
    prisma.patient.count(),
    prisma.medicalAssessment.count(),
    prisma.environmentAssessment.count(),
    prisma.needsIdentification.count(),
    prisma.user.count(),
    
    // Today's counts
    prisma.patient.count({ where: { createdAt: { gte: today } } }),
    prisma.medicalAssessment.count({ where: { createdAt: { gte: today } } }),
    
    // This week's counts
    prisma.patient.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.medicalAssessment.count({ where: { createdAt: { gte: startOfWeek } } }),
    
    // This month's counts
    prisma.patient.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.medicalAssessment.count({ where: { createdAt: { gte: startOfMonth } } }),
    
    // Group by statistics
    prisma.patient.groupBy({
      by: ['kelompokUsia'],
      _count: { kelompokUsia: true },
    }),
    prisma.patient.groupBy({
      by: ['jenisKelamin'],
      _count: { jenisKelamin: true },
    }),
    prisma.medicalAssessment.groupBy({
      by: ['tindakLanjut'],
      _count: { tindakLanjut: true },
    }),
    prisma.environmentAssessment.groupBy({
      by: ['aksesAirBersih'],
      _count: { aksesAirBersih: true },
    }),
    prisma.environmentAssessment.groupBy({
      by: ['kondisiSanitasi'],
      _count: { kondisiSanitasi: true },
    }),
    
    // Recent data
    prisma.patient.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nama: true,
        nik: true,
        jenisKelamin: true,     // ← TAMBAHKAN
        kelompokUsia: true,
        alamat: true,           // ← TAMBAHKAN (optional)
        tanggalLahir: true,     // ← TAMBAHKAN (optional)
        createdAt: true,
      },
    }),
    prisma.medicalAssessment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { nama: true, nik: true },
        },
      },
    }),
    
    // Active disasters
    prisma.disasterEvent.findMany({
      where: { status: 'AKTIF' },
      orderBy: { tanggalKejadian: 'desc' },
    }),
    
    // Top diagnoses
    prisma.medicalAssessment.groupBy({
      by: ['diagnosaKerja'],
      _count: { diagnosaKerja: true },
      orderBy: { _count: { diagnosaKerja: 'desc' } },
      take: 10,
    }),
  ]);

  // Calculate trends (daily data for the last 7 days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const [patientCount, assessmentCount] = await Promise.all([
      prisma.patient.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      }),
      prisma.medicalAssessment.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      }),
    ]);
    
    last7Days.push({
      date: date.toISOString().split('T')[0],
      patients: patientCount,
      assessments: assessmentCount,
    });
  }

  res.json({
    success: true,
    data: {
      summary: {
        totalPatients,
        totalAssessments,
        totalEnvironments,
        totalNeeds,
        totalUsers,
      },
      today: {
        patients: todayPatients,
        assessments: todayAssessments,
      },
      thisWeek: {
        patients: weekPatients,
        assessments: weekAssessments,
      },
      thisMonth: {
        patients: monthPatients,
        assessments: monthAssessments,
      },
      charts: {
        patientsByKelompokUsia: patientsByKelompokUsia.map((item: KelompokUsiaGroup) => ({
          name: item.kelompokUsia,
          value: item._count.kelompokUsia,
        })),
        patientsByJenisKelamin: patientsByJenisKelamin.map((item: JenisKelaminGroup) => ({
          name: item.jenisKelamin,
          value: item._count.jenisKelamin,
        })),
        assessmentsByTindakLanjut: assessmentsByTindakLanjut.map((item: TindakLanjutGroup) => ({
          name: item.tindakLanjut,
          value: item._count.tindakLanjut,
        })),
        environmentByAirBersih: environmentByAirBersih.map((item: AksesAirBersihGroup) => ({
          name: item.aksesAirBersih,
          value: item._count.aksesAirBersih,
        })),
        environmentBySanitasi: environmentBySanitasi.map((item: KondisiSanitasiGroup) => ({
          name: item.kondisiSanitasi,
          value: item._count.kondisiSanitasi,
        })),
        last7Days,
        topDiagnoses: topDiagnoses.map((d: DiagnosaGroup) => ({
          diagnosa: d.diagnosaKerja,
          count: d._count.diagnosaKerja,
        })),
      },
      recent: {
        patients: recentPatients,
        assessments: recentAssessments,
      },
      activeDisasters,
    },
  });
});

// Get user-specific dashboard (for Petugas)
export const getUserDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    myTotalPatients,
    myTotalAssessments,
    myTodayPatients,
    myTodayAssessments,
    myRecentPatients,
    myRecentAssessments,
  ] = await Promise.all([
    prisma.patient.count({ where: { createdBy: userId } }),
    prisma.medicalAssessment.count({ where: { createdBy: userId } }),
    prisma.patient.count({ 
      where: { 
        createdBy: userId,
        createdAt: { gte: today },
      },
    }),
    prisma.medicalAssessment.count({ 
      where: { 
        createdBy: userId,
        createdAt: { gte: today },
      },
    }),
    prisma.patient.findMany({
      where: { createdBy: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nama: true,
        nik: true,
        jenisKelamin: true,     // ← TAMBAHKAN INI
        kelompokUsia: true,
        alamat: true,           // ← Optional: untuk info lengkap
        tanggalLahir: true,     // ← Optional: untuk info lengkap
        createdAt: true
      },
    }),
    prisma.medicalAssessment.findMany({
      where: { createdBy: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { nama: true, nik: true },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        totalPatients: myTotalPatients,
        totalAssessments: myTotalAssessments,
      },
      today: {
        patients: myTodayPatients,
        assessments: myTodayAssessments,
      },
      recent: {
        patients: myRecentPatients,
        assessments: myRecentAssessments,
      },
    },
  });
});

export default {
  getDashboardStats,
  getUserDashboard,
};