import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Super Admin
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@sirana.go.id' },
    update: {},
    create: {
      email: 'admin@sirana.go.id',
      password: hashedPasswordAdmin,
      nama: 'Super Administrator',
      nip: '199001012020011001',
      role: UserRole.SUPER_ADMIN,
      jabatan: 'Administrator Sistem',
      unitKerja: 'Dinas Kesehatan Pusat',
      noTelp: '081234567890',
      isActive: true,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Petugas/Nakes
  const hashedPasswordPetugas = await bcrypt.hash('petugas123', 12);
  const petugas = await prisma.user.upsert({
    where: { email: 'petugas@sirana.go.id' },
    update: {},
    create: {
      email: 'petugas@sirana.go.id',
      password: hashedPasswordPetugas,
      nama: 'Dr. Ahmad Hidayat',
      nip: '199205152022011002',
      role: UserRole.PETUGAS,
      jabatan: 'Dokter Umum',
      unitKerja: 'Puskesmas Kota',
      noTelp: '081298765432',
      isActive: true,
    },
  });
  console.log('✅ Petugas created:', petugas.email);

  // Create sample disaster event
  const disaster = await prisma.disasterEvent.create({
    data: {
      namaBencana: 'Gempa Bumi Cianjur',
      jenisBencana: 'GEMPA_BUMI',
      tanggalKejadian: new Date('2024-01-15'),
      lokasi: 'Cianjur, Jawa Barat',
      provinsi: 'Jawa Barat',
      kabupaten: 'Cianjur',
      kecamatan: 'Cugenang',
      deskripsi: 'Gempa bumi dengan magnitudo 5.6 SR',
      status: 'AKTIF',
    },
  });
  console.log('✅ Disaster event created:', disaster.namaBencana);

  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Default Login Credentials:');
  console.log('   Super Admin: admin@sirana.go.id / admin123');
  console.log('   Petugas: petugas@sirana.go.id / petugas123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
