import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import prisma from '../config/database';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { 
  Patient, 
  MedicalAssessment, 
  EnvironmentAssessment, 
  NeedsIdentification,
  User 
} from '@prisma/client';

// Type definitions for includes
type PatientWithUser = Patient & {
  createdByUser: Pick<User, 'nama'>;
};

type MedicalAssessmentWithRelations = MedicalAssessment & {
  patient: Patient;
  createdByUser: Pick<User, 'nama'>;
};

type EnvironmentAssessmentWithRelations = EnvironmentAssessment & {
  patient: Patient;
  createdByUser: Pick<User, 'nama'>;
};

type NeedsIdentificationWithRelations = NeedsIdentification & {
  patient: Patient;
  createdByUser: Pick<User, 'nama'>;
};

// Helper function to format date
const formatDate = (date: Date | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (date: Date | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper to map enum values to readable text
const mapKelompokUsia = (value: string): string => {
  const map: Record<string, string> = {
    BALITA: 'Balita (1-5 Tahun)',
    ANAK: 'Anak (5-17 Tahun)',
    DEWASA: 'Dewasa (17-59 Tahun)',
    LANSIA: 'Lansia (>60 Tahun)',
    IBU_HAMIL: 'Ibu Hamil',
  };
  return map[value] || value;
};

const mapJenisKelamin = (value: string): string => {
  const map: Record<string, string> = {
    LAKI_LAKI: 'Laki-laki',
    PEREMPUAN: 'Perempuan',
  };
  return map[value] || value;
};

const mapTindakLanjut = (value: string): string => {
  const map: Record<string, string> = {
    PULANG: 'Pulang',
    RUJUK: 'Rujuk',
    TIDAK_RUJUK: 'Tidak Rujuk',
  };
  return map[value] || value;
};

const mapKeadaanUmum = (value: string): string => {
  const map: Record<string, string> = {
    BAIK: 'Baik',
    SEDANG: 'Sedang',
    BURUK: 'Buruk',
  };
  return map[value] || value;
};

const mapPrioritas = (value: string): string => {
  const map: Record<string, string> = {
    RENDAH: 'Rendah',
    SEDANG: 'Sedang',
    TINGGI: 'Tinggi',
    KRITIS: 'Kritis',
  };
  return map[value] || value;
};

// Helper to style header row
const styleHeaderRow = (worksheet: ExcelJS.Worksheet): void => {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7D3740' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
};

// Auto-fit columns
const autoFitColumns = (worksheet: ExcelJS.Worksheet): void => {
  worksheet.columns.forEach(column => {
    if (!column.values) return;
    
    let maxLength = 0;
    column.values.forEach((value: any) => {
      const length = value ? String(value).length : 10;
      if (length > maxLength) {
        maxLength = length;
      }
    });
    
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });
};

// Export all patients - NO LIMIT, ALL DATA
export const exportPatients = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, kelompokUsia } = req.query;

  const where: any = {};

  // Only apply filters if explicitly provided
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  if (kelompokUsia) {
    where.kelompokUsia = kelompokUsia;
  }

  console.log('🔍 Fetching ALL patients with filter:', where);

  // CRITICAL: NO LIMIT - Fetch ALL data
  const patients = await prisma.patient.findMany({
    where,
    include: {
      createdByUser: {
        select: { nama: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    // NO take, NO skip - Get ALL data
  });

  console.log(`✅ Found ${patients.length} patients to export`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Pasien');

  // Define columns with ALL fields
  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIK', key: 'nik', width: 20 },
    { header: 'Nama Lengkap', key: 'nama', width: 30 },
    { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 15 },
    { header: 'Tempat Lahir', key: 'tempatLahir', width: 20 },
    { header: 'Tanggal Lahir', key: 'tanggalLahir', width: 20 },
    { header: 'Kelompok Usia', key: 'kelompokUsia', width: 25 },
    { header: 'Usia Kehamilan (Minggu)', key: 'usiaKehamilan', width: 22 },
    { header: 'Agama', key: 'agama', width: 15 },
    { header: 'Pekerjaan', key: 'pekerjaan', width: 20 },
    { header: 'No. Telepon', key: 'noTelp', width: 18 },
    { header: 'Alamat', key: 'alamat', width: 40 },
    { header: 'RT', key: 'rt', width: 8 },
    { header: 'RW', key: 'rw', width: 8 },
    { header: 'Kelurahan/Desa', key: 'kelurahan', width: 20 },
    { header: 'Kecamatan', key: 'kecamatan', width: 20 },
    { header: 'Kabupaten/Kota', key: 'kabupaten', width: 20 },
    { header: 'Provinsi', key: 'provinsi', width: 20 },
    { header: 'Petugas Input', key: 'petugasInput', width: 25 },
    { header: 'Tanggal Input', key: 'tanggalInput', width: 25 },
    { header: 'Waktu Update Terakhir', key: 'updatedAt', width: 25 },
  ];

  // Add ALL data rows
  patients.forEach((p: PatientWithUser, index: number) => {
    worksheet.addRow({
      no: index + 1,
      nik: p.nik || '-',
      nama: p.nama,
      jenisKelamin: mapJenisKelamin(p.jenisKelamin),
      tempatLahir: p.tempatLahir,
      tanggalLahir: formatDate(p.tanggalLahir),
      kelompokUsia: mapKelompokUsia(p.kelompokUsia),
      usiaKehamilan: p.usiaKehamilan || '-',
      agama: p.agama || '-',
      pekerjaan: p.pekerjaan || '-',
      noTelp: p.noTelp || '-',
      alamat: p.alamat,
      rt: p.rt || '-',
      rw: p.rw || '-',
      kelurahan: p.kelurahan || '-',
      kecamatan: p.kecamatan || '-',
      kabupaten: p.kabupaten || '-',
      provinsi: p.provinsi || '-',
      petugasInput: p.createdByUser.nama,
      tanggalInput: formatDateTime(p.createdAt),
      updatedAt: formatDateTime(p.updatedAt),
    });
  });

  styleHeaderRow(worksheet);
  autoFitColumns(worksheet);

  // Add summary at the bottom
  worksheet.addRow({});
  worksheet.addRow({ no: '', nik: `Total Data: ${patients.length} pasien` });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Data_Pasien_SIRANA_${new Date().toISOString().split('T')[0]}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();

  console.log(`✅ Export completed: ${patients.length} patients exported`);
});

// Export medical assessments - NO LIMIT, ALL DATA
export const exportAssessments = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, tindakLanjut } = req.query;

  const where: any = {};

  // Only apply filters if explicitly provided
  if (startDate && endDate) {
    where.tanggalKunjungan = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  if (tindakLanjut) {
    where.tindakLanjut = tindakLanjut;
  }

  console.log('🔍 Fetching ALL assessments with filter:', where);

  // CRITICAL: NO LIMIT - Fetch ALL data
  const assessments = await prisma.medicalAssessment.findMany({
    where,
    include: {
      patient: true,
      createdByUser: {
        select: { nama: true },
      },
    },
    orderBy: { tanggalKunjungan: 'desc' },
    // NO take, NO skip - Get ALL data
  });

  console.log(`✅ Found ${assessments.length} assessments to export`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Assesmen Medis');

  // Define ALL columns
  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'ID Assesmen', key: 'id', width: 12 },
    { header: 'Tanggal Kunjungan', key: 'tanggalKunjungan', width: 18 },
    { header: 'Jam Kunjungan', key: 'jamKunjungan', width: 15 },
    { header: 'NIK Pasien', key: 'nikPasien', width: 20 },
    { header: 'Nama Pasien', key: 'namaPasien', width: 30 },
    { header: 'Kelompok Usia', key: 'kelompokUsia', width: 25 },
    { header: 'Jenis Anamnesis', key: 'jenisAnamnesis', width: 18 },
    { header: 'Keluhan Utama', key: 'keluhanUtama', width: 35 },
    { header: 'Riwayat Penyakit Sekarang', key: 'riwayatPenyakitSekarang', width: 30 },
    { header: 'Riwayat Alergi', key: 'riwayatAlergi', width: 20 },
    { header: 'Riwayat Penyakit Terdahulu', key: 'riwayatPenyakitTerdahulu', width: 30 },
    { header: 'Riwayat Penggunaan Obat', key: 'riwayatPenggunaanObat', width: 25 },
    { header: 'GCS Eye', key: 'gcsEye', width: 10 },
    { header: 'GCS Verbal', key: 'gcsVerbal', width: 12 },
    { header: 'GCS Motorik', key: 'gcsMotoric', width: 12 },
    { header: 'GCS Total', key: 'gcsTotal', width: 12 },
    { header: 'Keadaan Umum', key: 'keadaanUmum', width: 15 },
    { header: 'Tekanan Darah Sistolik', key: 'tdSistolik', width: 20 },
    { header: 'Tekanan Darah Diastolik', key: 'tdDiastolik', width: 20 },
    { header: 'Tekanan Darah (Format)', key: 'tekananDarah', width: 20 },
    { header: 'Suhu (°C)', key: 'suhu', width: 12 },
    { header: 'Nadi (x/menit)', key: 'nadi', width: 15 },
    { header: 'Respirasi (x/menit)', key: 'respirasi', width: 18 },
    { header: 'Berat Badan (kg)', key: 'beratBadan', width: 16 },
    { header: 'Tinggi Badan (cm)', key: 'tinggiBadan', width: 16 },
    { header: 'Pemeriksaan Kepala', key: 'kepala', width: 25 },
    { header: 'Pemeriksaan Mata', key: 'mata', width: 25 },
    { header: 'Pemeriksaan Mulut', key: 'mulut', width: 25 },
    { header: 'Pemeriksaan Leher', key: 'leher', width: 25 },
    { header: 'Pemeriksaan Thorax', key: 'thorax', width: 25 },
    { header: 'Pemeriksaan Cor', key: 'cor', width: 25 },
    { header: 'Pemeriksaan Pulmo', key: 'pulmo', width: 25 },
    { header: 'Pemeriksaan Abdomen', key: 'abdomen', width: 25 },
    { header: 'Pemeriksaan Ekstremitas', key: 'ekstremitas', width: 25 },
    { header: 'Pemeriksaan Anus-Genitalia', key: 'anusGenitalia', width: 25 },
    { header: 'Jenis Pemeriksaan Penunjang', key: 'pemeriksaanPenunjang', width: 25 },
    { header: 'Hasil Pemeriksaan Penunjang', key: 'hasilPenunjang', width: 30 },
    { header: 'Diagnosa Kerja', key: 'diagnosaKerja', width: 35 },
    { header: 'Penatalaksanaan', key: 'penatalaksanaan', width: 30 },
    { header: 'Tindak Lanjut', key: 'tindakLanjut', width: 15 },
    { header: 'Rujuk Ke', key: 'rujukKe', width: 25 },
    { header: 'Alasan Rujuk', key: 'alasanRujuk', width: 30 },
    { header: 'KIE Diberikan Kepada', key: 'kiePenerima', width: 20 },
    { header: 'Keterangan KIE', key: 'kieKeterangan', width: 30 },
    { header: 'Dokter Pemeriksa', key: 'dokterPemeriksa', width: 25 },
    { header: 'Petugas Input', key: 'petugasInput', width: 25 },
    { header: 'Waktu Input', key: 'createdAt', width: 25 },
    { header: 'Waktu Update Terakhir', key: 'updatedAt', width: 25 },
  ];

  // Add ALL data rows
  assessments.forEach((a: MedicalAssessmentWithRelations, index: number) => {
    const gcsTotal = a.gcsEye + a.gcsVerbal + a.gcsMotoric;
    
    worksheet.addRow({
      no: index + 1,
      id: a.id.substring(0, 8),
      tanggalKunjungan: formatDate(a.tanggalKunjungan),
      jamKunjungan: a.jamKunjungan,
      nikPasien: a.patient.nik || '-',
      namaPasien: a.patient.nama,
      kelompokUsia: mapKelompokUsia(a.patient.kelompokUsia),
      jenisAnamnesis: a.anamnesisType === 'AUTO_ANAMNESIS' ? 'Auto-Anamnesis' : 'Allo-Anamnesis',
      keluhanUtama: a.keluhanUtama,
      riwayatPenyakitSekarang: a.riwayatPenyakitSekarang || '-',
      riwayatAlergi: a.riwayatAlergi || '-',
      riwayatPenyakitTerdahulu: a.riwayatPenyakitTerdahulu || '-',
      riwayatPenggunaanObat: a.riwayatPenggunaanObat || '-',
      gcsEye: a.gcsEye,
      gcsVerbal: a.gcsVerbal,
      gcsMotoric: a.gcsMotoric,
      gcsTotal: gcsTotal,
      keadaanUmum: mapKeadaanUmum(a.keadaanUmum),
      tdSistolik: a.tekananDarahSistolik || '-',
      tdDiastolik: a.tekananDarahDiastolik || '-',
      tekananDarah: a.tekananDarahSistolik && a.tekananDarahDiastolik 
        ? `${a.tekananDarahSistolik}/${a.tekananDarahDiastolik} mmHg` 
        : '-',
      suhu: a.suhu || '-',
      nadi: a.nadi || '-',
      respirasi: a.respirasi || '-',
      beratBadan: a.beratBadan || '-',
      tinggiBadan: a.tinggiBadan || '-',
      kepala: a.kepala || '-',
      mata: a.mata || '-',
      mulut: a.mulut || '-',
      leher: a.leher || '-',
      thorax: a.thorax || '-',
      cor: a.cor || '-',
      pulmo: a.pulmo || '-',
      abdomen: a.abdomen || '-',
      ekstremitas: a.ekstremitas || '-',
      anusGenitalia: a.anusGenitalia || '-',
      pemeriksaanPenunjang: a.pemeriksaanPenunjang,
      hasilPenunjang: a.hasilPenunjang || '-',
      diagnosaKerja: a.diagnosaKerja,
      penatalaksanaan: a.penatalaksanaan || '-',
      tindakLanjut: mapTindakLanjut(a.tindakLanjut),
      rujukKe: a.rujukKe || '-',
      alasanRujuk: a.alasanRujuk || '-',
      kiePenerima: a.kiePenerima === 'PASIEN' ? 'Pasien' : 'Keluarga Pasien',
      kieKeterangan: a.kieKeterangan || '-',
      dokterPemeriksa: a.dokterPemeriksa,
      petugasInput: a.createdByUser.nama,
      createdAt: formatDateTime(a.createdAt),
      updatedAt: formatDateTime(a.updatedAt),
    });
  });

  styleHeaderRow(worksheet);
  autoFitColumns(worksheet);

  // Add summary
  worksheet.addRow({});
  worksheet.addRow({ no: '', id: `Total Data: ${assessments.length} assesmen medis` });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Assesmen_Medis_SIRANA_${new Date().toISOString().split('T')[0]}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();

  console.log(`✅ Export completed: ${assessments.length} assessments exported`);
});

// Export environment assessments - NO LIMIT, ALL DATA
export const exportEnvironments = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const where: any = {};

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  console.log('🔍 Fetching ALL environments with filter:', where);

  // CRITICAL: NO LIMIT - Fetch ALL data
  const environments = await prisma.environmentAssessment.findMany({
    where,
    include: {
      patient: true,
      createdByUser: {
        select: { nama: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    // NO take, NO skip - Get ALL data
  });

  console.log(`✅ Found ${environments.length} environments to export`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Kondisi Lingkungan');

  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'ID Penilaian', key: 'id', width: 12 },
    { header: 'NIK Pasien', key: 'nikPasien', width: 20 },
    { header: 'Nama Pasien', key: 'namaPasien', width: 30 },
    { header: 'Kelompok Usia', key: 'kelompokUsia', width: 25 },
    { header: 'Alamat Lengkap', key: 'alamat', width: 40 },
    { header: 'RT', key: 'rt', width: 8 },
    { header: 'RW', key: 'rw', width: 8 },
    { header: 'Kelurahan/Desa', key: 'kelurahan', width: 20 },
    { header: 'Kecamatan', key: 'kecamatan', width: 20 },
    { header: 'Akses Air Bersih', key: 'aksesAirBersih', width: 18 },
    { header: 'Kondisi Sanitasi', key: 'kondisiSanitasi', width: 18 },
    { header: 'Jumlah Foto', key: 'jumlahFoto', width: 12 },
    { header: 'Catatan Lingkungan', key: 'catatan', width: 40 },
    { header: 'Petugas Input', key: 'petugasInput', width: 25 },
    { header: 'Waktu Input', key: 'tanggalInput', width: 25 },
    { header: 'Waktu Update Terakhir', key: 'updatedAt', width: 25 },
  ];

  environments.forEach((e: EnvironmentAssessmentWithRelations, index: number) => {
    worksheet.addRow({
      no: index + 1,
      id: e.id.substring(0, 8),
      nikPasien: e.patient.nik || '-',
      namaPasien: e.patient.nama,
      kelompokUsia: mapKelompokUsia(e.patient.kelompokUsia),
      alamat: e.patient.alamat,
      rt: e.patient.rt || '-',
      rw: e.patient.rw || '-',
      kelurahan: e.patient.kelurahan || '-',
      kecamatan: e.patient.kecamatan || '-',
      aksesAirBersih: e.aksesAirBersih === 'ADA' ? 'Ada' : 'Tidak Ada',
      kondisiSanitasi: e.kondisiSanitasi === 'BAIK' ? 'Baik' : 'Buruk',
      jumlahFoto: e.fotoTempatTinggal.length,
      catatan: e.catatanLingkungan || '-',
      petugasInput: e.createdByUser.nama,
      tanggalInput: formatDateTime(e.createdAt),
      updatedAt: formatDateTime(e.updatedAt),
    });
  });

  styleHeaderRow(worksheet);
  autoFitColumns(worksheet);

  // Add summary
  worksheet.addRow({});
  worksheet.addRow({ no: '', id: `Total Data: ${environments.length} penilaian lingkungan` });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Kondisi_Lingkungan_SIRANA_${new Date().toISOString().split('T')[0]}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();

  console.log(`✅ Export completed: ${environments.length} environments exported`);
});

// Export needs identification - NO LIMIT, ALL DATA
export const exportNeeds = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const where: any = {};

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  console.log('🔍 Fetching ALL needs with filter:', where);

  // CRITICAL: NO LIMIT - Fetch ALL data
  const needs = await prisma.needsIdentification.findMany({
    where,
    include: {
      patient: true,
      createdByUser: {
        select: { nama: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    // NO take, NO skip - Get ALL data
  });

  console.log(`✅ Found ${needs.length} needs to export`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Identifikasi Kebutuhan');

  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'ID Identifikasi', key: 'id', width: 12 },
    { header: 'NIK Pasien', key: 'nikPasien', width: 20 },
    { header: 'Nama Pasien', key: 'namaPasien', width: 30 },
    { header: 'Kelompok Usia', key: 'kelompokUsia', width: 25 },
    { header: 'Alamat', key: 'alamat', width: 35 },
    { header: 'Obat-obatan (List)', key: 'obatObatan', width: 40 },
    { header: 'Prioritas Obat', key: 'prioritasObat', width: 15 },
    { header: 'Alat Kesehatan (List)', key: 'alatKesehatan', width: 40 },
    { header: 'Prioritas Alat', key: 'prioritasAlat', width: 15 },
    { header: 'Infrastruktur (List)', key: 'infrastruktur', width: 40 },
    { header: 'Prioritas Infrastruktur', key: 'prioritasInfrastruktur', width: 20 },
    { header: 'Keterangan Tambahan', key: 'keterangan', width: 40 },
    { header: 'Petugas Input', key: 'petugasInput', width: 25 },
    { header: 'Waktu Input', key: 'tanggalInput', width: 25 },
    { header: 'Waktu Update Terakhir', key: 'updatedAt', width: 25 },
  ];

  needs.forEach((n: NeedsIdentificationWithRelations, index: number) => {
    worksheet.addRow({
      no: index + 1,
      id: n.id.substring(0, 8),
      nikPasien: n.patient.nik || '-',
      namaPasien: n.patient.nama,
      kelompokUsia: mapKelompokUsia(n.patient.kelompokUsia),
      alamat: n.patient.alamat,
      obatObatan: n.obatObatan.length > 0 ? n.obatObatan.join(', ') : '-',
      prioritasObat: mapPrioritas(n.prioritasObat),
      alatKesehatan: n.alatKesehatan.length > 0 ? n.alatKesehatan.join(', ') : '-',
      prioritasAlat: mapPrioritas(n.prioritasAlat),
      infrastruktur: n.infrastruktur.length > 0 ? n.infrastruktur.join(', ') : '-',
      prioritasInfrastruktur: mapPrioritas(n.prioritasInfrastruktur),
      keterangan: n.keterangan || '-',
      petugasInput: n.createdByUser.nama,
      tanggalInput: formatDateTime(n.createdAt),
      updatedAt: formatDateTime(n.updatedAt),
    });
  });

  styleHeaderRow(worksheet);
  autoFitColumns(worksheet);

  // Add summary
  worksheet.addRow({});
  worksheet.addRow({ no: '', id: `Total Data: ${needs.length} identifikasi kebutuhan` });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Identifikasi_Kebutuhan_SIRANA_${new Date().toISOString().split('T')[0]}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();

  console.log(`✅ Export completed: ${needs.length} needs exported`);
});

// Export comprehensive report - NO LIMIT, ALL DATA
export const exportComprehensiveReport = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const dateFilter: any = {};
  const assessmentDateFilter: any = {};
  
  if (startDate && endDate) {
    dateFilter.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
    assessmentDateFilter.tanggalKunjungan = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  console.log('🔍 Fetching ALL comprehensive data with filter:', dateFilter);

  // CRITICAL: NO LIMIT - Fetch ALL data from all tables
  const [patients, assessments, environments, needs] = await Promise.all([
    prisma.patient.findMany({
      where: dateFilter,
      include: { createdByUser: { select: { nama: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.medicalAssessment.findMany({
      where: assessmentDateFilter,
      include: { 
        patient: true, 
        createdByUser: { select: { nama: true } } 
      },
      orderBy: { tanggalKunjungan: 'desc' },
    }),
    prisma.environmentAssessment.findMany({
      where: dateFilter,
      include: { 
        patient: true, 
        createdByUser: { select: { nama: true } } 
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.needsIdentification.findMany({
      where: dateFilter,
      include: { 
        patient: true, 
        createdByUser: { select: { nama: true } } 
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  console.log(`✅ Comprehensive data fetched:
    - Patients: ${patients.length}
    - Assessments: ${assessments.length}
    - Environments: ${environments.length}
    - Needs: ${needs.length}
    - TOTAL: ${patients.length + assessments.length + environments.length + needs.length} records
  `);

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Ringkasan (Summary First)
  const ws5 = workbook.addWorksheet('Ringkasan');
  ws5.columns = [
    { header: 'Kategori', key: 'kategori', width: 35 },
    { header: 'Jumlah', key: 'jumlah', width: 15 },
  ];
  
  const summaryData = [
    { kategori: '📊 RINGKASAN DATA SIRANA', jumlah: '' },
    { kategori: '', jumlah: '' },
    { kategori: 'Total Pasien Terdaftar', jumlah: patients.length },
    { kategori: 'Total Assesmen Medis', jumlah: assessments.length },
    { kategori: 'Total Penilaian Lingkungan', jumlah: environments.length },
    { kategori: 'Total Identifikasi Kebutuhan', jumlah: needs.length },
    { kategori: '', jumlah: '' },
    { kategori: '🏥 TINDAK LANJUT MEDIS', jumlah: '' },
    { kategori: 'Pasien Dirujuk', jumlah: assessments.filter((a: MedicalAssessmentWithRelations) => a.tindakLanjut === 'RUJUK').length },
    { kategori: 'Pasien Pulang', jumlah: assessments.filter((a: MedicalAssessmentWithRelations) => a.tindakLanjut === 'PULANG').length },
    { kategori: 'Tidak Dirujuk', jumlah: assessments.filter((a: MedicalAssessmentWithRelations) => a.tindakLanjut === 'TIDAK_RUJUK').length },
    { kategori: '', jumlah: '' },
    { kategori: '💧 KONDISI LINGKUNGAN', jumlah: '' },
    { kategori: 'Air Bersih Tersedia', jumlah: environments.filter((e: EnvironmentAssessmentWithRelations) => e.aksesAirBersih === 'ADA').length },
    { kategori: 'Air Bersih Tidak Tersedia', jumlah: environments.filter((e: EnvironmentAssessmentWithRelations) => e.aksesAirBersih === 'TIDAK_ADA').length },
    { kategori: 'Sanitasi Baik', jumlah: environments.filter((e: EnvironmentAssessmentWithRelations) => e.kondisiSanitasi === 'BAIK').length },
    { kategori: 'Sanitasi Buruk', jumlah: environments.filter((e: EnvironmentAssessmentWithRelations) => e.kondisiSanitasi === 'BURUK').length },
    { kategori: '', jumlah: '' },
    { kategori: '📅 Tanggal Export', jumlah: new Date().toLocaleDateString('id-ID') },
    { kategori: '⏰ Waktu Export', jumlah: new Date().toLocaleTimeString('id-ID') },
  ];
  
  summaryData.forEach(row => {
    ws5.addRow(row);
  });
  styleHeaderRow(ws5);
  
  // Sheet 2: Data Pasien (Full details)
  const ws1 = workbook.addWorksheet('Data Pasien');
  ws1.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIK', key: 'nik', width: 20 },
    { header: 'Nama Lengkap', key: 'nama', width: 30 },
    { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 15 },
    { header: 'Tempat Lahir', key: 'tempatLahir', width: 20 },
    { header: 'Tanggal Lahir', key: 'tanggalLahir', width: 18 },
    { header: 'Kelompok Usia', key: 'kelompokUsia', width: 25 },
    { header: 'Agama', key: 'agama', width: 12 },
    { header: 'Pekerjaan', key: 'pekerjaan', width: 20 },
    { header: 'Alamat', key: 'alamat', width: 40 },
    { header: 'Kelurahan', key: 'kelurahan', width: 18 },
    { header: 'Kecamatan', key: 'kecamatan', width: 18 },
    { header: 'Waktu Input', key: 'tanggalInput', width: 20 },
  ];
  patients.forEach((p: PatientWithUser, index: number) => {
    ws1.addRow({
      no: index + 1,
      nik: p.nik || '-',
      nama: p.nama,
      jenisKelamin: mapJenisKelamin(p.jenisKelamin),
      tempatLahir: p.tempatLahir,
      tanggalLahir: formatDate(p.tanggalLahir),
      kelompokUsia: mapKelompokUsia(p.kelompokUsia),
      agama: p.agama || '-',
      pekerjaan: p.pekerjaan || '-',
      alamat: p.alamat,
      kelurahan: p.kelurahan || '-',
      kecamatan: p.kecamatan || '-',
      tanggalInput: formatDateTime(p.createdAt),
    });
  });
  styleHeaderRow(ws1);
  ws1.addRow({});
  ws1.addRow({ no: '', nik: `Total: ${patients.length} pasien` });

  // Sheet 3: Assesmen Medis (Full details)
  const ws2 = workbook.addWorksheet('Assesmen Medis');
  ws2.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Tanggal', key: 'tanggalKunjungan', width: 18 },
    { header: 'Nama Pasien', key: 'namaPasien', width: 25 },
    { header: 'Keluhan Utama', key: 'keluhanUtama', width: 30 },
    { header: 'GCS', key: 'gcsTotal', width: 8 },
    { header: 'TD', key: 'td', width: 15 },
    { header: 'Diagnosa', key: 'diagnosaKerja', width: 30 },
    { header: 'Tindak Lanjut', key: 'tindakLanjut', width: 12 },
    { header: 'Dokter', key: 'dokterPemeriksa', width: 20 },
  ];
  assessments.forEach((a: MedicalAssessmentWithRelations, index: number) => {
    ws2.addRow({
      no: index + 1,
      tanggalKunjungan: formatDate(a.tanggalKunjungan),
      namaPasien: a.patient.nama,
      keluhanUtama: a.keluhanUtama,
      gcsTotal: a.gcsEye + a.gcsVerbal + a.gcsMotoric,
      td: a.tekananDarahSistolik && a.tekananDarahDiastolik 
        ? `${a.tekananDarahSistolik}/${a.tekananDarahDiastolik}`
        : '-',
      diagnosaKerja: a.diagnosaKerja,
      tindakLanjut: mapTindakLanjut(a.tindakLanjut),
      dokterPemeriksa: a.dokterPemeriksa,
    });
  });
  styleHeaderRow(ws2);
  ws2.addRow({});
  ws2.addRow({ no: '', tanggalKunjungan: `Total: ${assessments.length} assesmen` });

  // Sheet 4: Kondisi Lingkungan (Full details)
  const ws3 = workbook.addWorksheet('Kondisi Lingkungan');
  ws3.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama Pasien', key: 'namaPasien', width: 25 },
    { header: 'Alamat', key: 'alamat', width: 35 },
    { header: 'Air Bersih', key: 'aksesAirBersih', width: 12 },
    { header: 'Sanitasi', key: 'kondisiSanitasi', width: 12 },
    { header: 'Catatan', key: 'catatan', width: 30 },
    { header: 'Waktu Input', key: 'tanggalInput', width: 20 },
  ];
  environments.forEach((e: EnvironmentAssessmentWithRelations, index: number) => {
    ws3.addRow({
      no: index + 1,
      namaPasien: e.patient.nama,
      alamat: e.patient.alamat,
      aksesAirBersih: e.aksesAirBersih === 'ADA' ? 'Ada' : 'Tidak Ada',
      kondisiSanitasi: e.kondisiSanitasi === 'BAIK' ? 'Baik' : 'Buruk',
      catatan: e.catatanLingkungan || '-',
      tanggalInput: formatDateTime(e.createdAt),
    });
  });
  styleHeaderRow(ws3);
  ws3.addRow({});
  ws3.addRow({ no: '', namaPasien: `Total: ${environments.length} penilaian` });

  // Sheet 5: Identifikasi Kebutuhan (Full details)
  const ws4 = workbook.addWorksheet('Identifikasi Kebutuhan');
  ws4.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama Pasien', key: 'namaPasien', width: 25 },
    { header: 'Obat-obatan', key: 'obatObatan', width: 30 },
    { header: 'Prior. Obat', key: 'prioritasObat', width: 12 },
    { header: 'Alat Kesehatan', key: 'alatKesehatan', width: 30 },
    { header: 'Prior. Alat', key: 'prioritasAlat', width: 12 },
    { header: 'Infrastruktur', key: 'infrastruktur', width: 30 },
    { header: 'Prior. Infra', key: 'prioritasInfrastruktur', width: 12 },
    { header: 'Waktu Input', key: 'tanggalInput', width: 20 },
  ];
  needs.forEach((n: NeedsIdentificationWithRelations, index: number) => {
    ws4.addRow({
      no: index + 1,
      namaPasien: n.patient.nama,
      obatObatan: n.obatObatan.length > 0 ? n.obatObatan.join(', ') : '-',
      prioritasObat: mapPrioritas(n.prioritasObat),
      alatKesehatan: n.alatKesehatan.length > 0 ? n.alatKesehatan.join(', ') : '-',
      prioritasAlat: mapPrioritas(n.prioritasAlat),
      infrastruktur: n.infrastruktur.length > 0 ? n.infrastruktur.join(', ') : '-',
      prioritasInfrastruktur: mapPrioritas(n.prioritasInfrastruktur),
      tanggalInput: formatDateTime(n.createdAt),
    });
  });
  styleHeaderRow(ws4);
  ws4.addRow({});
  ws4.addRow({ no: '', namaPasien: `Total: ${needs.length} identifikasi` });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Laporan_Lengkap_SIRANA_${new Date().toISOString().split('T')[0]}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();

  console.log(`✅ Comprehensive export completed:
    - Total records exported: ${patients.length + assessments.length + environments.length + needs.length}
    - 5 sheets created successfully
  `);
});

export default {
  exportPatients,
  exportAssessments,
  exportEnvironments,
  exportNeeds,
  exportComprehensiveReport,
};