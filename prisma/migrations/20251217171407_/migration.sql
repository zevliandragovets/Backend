-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'PETUGAS');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "KelompokUsia" AS ENUM ('BALITA', 'ANAK', 'DEWASA', 'LANSIA', 'IBU_HAMIL');

-- CreateEnum
CREATE TYPE "Agama" AS ENUM ('ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA');

-- CreateEnum
CREATE TYPE "AnamnesisType" AS ENUM ('AUTO_ANAMNESIS', 'ALLO_ANAMNESIS');

-- CreateEnum
CREATE TYPE "PemeriksaanPenunjang" AS ENUM ('LAB', 'RONTGEN', 'CT_SCAN', 'LAIN_LAIN', 'TIDAK_ADA');

-- CreateEnum
CREATE TYPE "TindakLanjut" AS ENUM ('PULANG', 'RUJUK', 'TIDAK_RUJUK');

-- CreateEnum
CREATE TYPE "KIEPenerima" AS ENUM ('PASIEN', 'KELUARGA_PASIEN');

-- CreateEnum
CREATE TYPE "KeadaanUmum" AS ENUM ('BAIK', 'SEDANG', 'BURUK');

-- CreateEnum
CREATE TYPE "AksesAirBersih" AS ENUM ('ADA', 'TIDAK_ADA');

-- CreateEnum
CREATE TYPE "KondisiSanitasi" AS ENUM ('BAIK', 'BURUK');

-- CreateEnum
CREATE TYPE "PrioritasKebutuhan" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI', 'KRITIS');

-- CreateEnum
CREATE TYPE "JenisBencana" AS ENUM ('GEMPA_BUMI', 'TSUNAMI', 'BANJIR', 'TANAH_LONGSOR', 'GUNUNG_MELETUS', 'KEBAKARAN', 'ANGIN_TOPAN', 'KEKERINGAN', 'EPIDEMI', 'LAINNYA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nip" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PETUGAS',
    "jabatan" TEXT,
    "unitKerja" TEXT,
    "noTelp" TEXT,
    "foto" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "tempatLahir" TEXT NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "alamat" TEXT NOT NULL,
    "rt" TEXT,
    "rw" TEXT,
    "kelurahan" TEXT,
    "kecamatan" TEXT,
    "kabupaten" TEXT,
    "provinsi" TEXT,
    "agama" "Agama" NOT NULL,
    "pekerjaan" TEXT,
    "noTelp" TEXT,
    "kelompokUsia" "KelompokUsia" NOT NULL,
    "usiaKehamilan" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tanggalKunjungan" TIMESTAMP(3) NOT NULL,
    "jamKunjungan" TEXT NOT NULL,
    "anamnesisType" "AnamnesisType" NOT NULL,
    "keluhanUtama" TEXT NOT NULL,
    "riwayatPenyakitSekarang" TEXT,
    "riwayatAlergi" TEXT,
    "riwayatPenyakitTerdahulu" TEXT,
    "riwayatPenggunaanObat" TEXT,
    "gcsEye" INTEGER NOT NULL DEFAULT 4,
    "gcsVerbal" INTEGER NOT NULL DEFAULT 5,
    "gcsMotoric" INTEGER NOT NULL DEFAULT 6,
    "keadaanUmum" "KeadaanUmum" NOT NULL DEFAULT 'BAIK',
    "tekananDarahSistolik" INTEGER,
    "tekananDarahDiastolik" INTEGER,
    "suhu" DOUBLE PRECISION,
    "nadi" INTEGER,
    "respirasi" INTEGER,
    "beratBadan" DOUBLE PRECISION,
    "tinggiBadan" DOUBLE PRECISION,
    "kepala" TEXT,
    "mata" TEXT,
    "mulut" TEXT,
    "leher" TEXT,
    "thorax" TEXT,
    "cor" TEXT,
    "pulmo" TEXT,
    "abdomen" TEXT,
    "ekstremitas" TEXT,
    "anusGenitalia" TEXT,
    "pemeriksaanPenunjang" "PemeriksaanPenunjang" NOT NULL DEFAULT 'TIDAK_ADA',
    "hasilPenunjang" TEXT,
    "diagnosaKerja" TEXT NOT NULL,
    "penatalaksanaan" TEXT,
    "tindakLanjut" "TindakLanjut" NOT NULL DEFAULT 'PULANG',
    "rujukKe" TEXT,
    "alasanRujuk" TEXT,
    "kiePenerima" "KIEPenerima" NOT NULL DEFAULT 'PASIEN',
    "kieKeterangan" TEXT,
    "dokterPemeriksa" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "aksesAirBersih" "AksesAirBersih" NOT NULL,
    "kondisiSanitasi" "KondisiSanitasi" NOT NULL,
    "fotoTempatTinggal" TEXT[],
    "catatanLingkungan" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "needs_identifications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "obatObatan" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alatKesehatan" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "infrastruktur" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prioritasObat" "PrioritasKebutuhan" NOT NULL DEFAULT 'SEDANG',
    "prioritasAlat" "PrioritasKebutuhan" NOT NULL DEFAULT 'SEDANG',
    "prioritasInfrastruktur" "PrioritasKebutuhan" NOT NULL DEFAULT 'SEDANG',
    "keterangan" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "needs_identifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disaster_events" (
    "id" TEXT NOT NULL,
    "namaBencana" TEXT NOT NULL,
    "jenisBencana" "JenisBencana" NOT NULL,
    "tanggalKejadian" TIMESTAMP(3) NOT NULL,
    "lokasi" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kabupaten" TEXT NOT NULL,
    "kecamatan" TEXT,
    "deskripsi" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disaster_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "patients_nik_key" ON "patients"("nik");

-- CreateIndex
CREATE INDEX "needs_identifications_patientId_idx" ON "needs_identifications"("patientId");

-- CreateIndex
CREATE INDEX "needs_identifications_createdBy_idx" ON "needs_identifications"("createdBy");

-- CreateIndex
CREATE INDEX "needs_identifications_prioritasObat_idx" ON "needs_identifications"("prioritasObat");

-- CreateIndex
CREATE INDEX "needs_identifications_prioritasAlat_idx" ON "needs_identifications"("prioritasAlat");

-- CreateIndex
CREATE INDEX "needs_identifications_prioritasInfrastruktur_idx" ON "needs_identifications"("prioritasInfrastruktur");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_assessments" ADD CONSTRAINT "medical_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_assessments" ADD CONSTRAINT "medical_assessments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_assessments" ADD CONSTRAINT "environment_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_assessments" ADD CONSTRAINT "environment_assessments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "needs_identifications" ADD CONSTRAINT "needs_identifications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "needs_identifications" ADD CONSTRAINT "needs_identifications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
