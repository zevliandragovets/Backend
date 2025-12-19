# SIRINA Indonesia - Backend API

RESTful API untuk Sistem Informasi Surveilans Kesehatan Pasca Bencana.

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT
- **File Upload**: Multer
- **Excel Export**: xlsx

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sirina_indonesia
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

### 3. Create Database

```bash
createdb sirina_indonesia
```

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Seed Initial Data

```bash
npm run seed
```

Default users created:
- **Admin**: `admin` / `admin123`
- **Petugas**: `petugas1` / `petugas123`

### 6. Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Server runs at `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # Database connection
│   │   ├── migrate.ts       # Migration script
│   │   └── seed.ts          # Seeder script
│   ├── controllers/
│   │   ├── AuthController.ts
│   │   ├── PatientController.ts
│   │   ├── MedicalAssessmentController.ts
│   │   ├── EnvironmentalAssessmentController.ts
│   │   ├── LocationController.ts
│   │   ├── UserController.ts
│   │   └── ExportController.ts
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication
│   │   └── upload.ts        # File upload handling
│   ├── models/
│   │   ├── User.ts
│   │   ├── Patient.ts
│   │   ├── Location.ts
│   │   ├── MedicalAssessment.ts
│   │   └── EnvironmentalAssessment.ts
│   ├── routes/
│   │   ├── index.ts         # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── patient.routes.ts
│   │   └── ...
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts             # Entry point
├── uploads/                  # File uploads directory
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile` | Get current user profile |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/profile-photo` | Upload profile photo |

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List patients (paginated) |
| POST | `/api/patients` | Create patient |
| GET | `/api/patients/:id` | Get patient by ID |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |

Query Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by NIK or name
- `age_group` - Filter by age group
- `gender` - Filter by gender
- `location_id` - Filter by location

### Medical Assessments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medical-assessments` | List assessments |
| POST | `/api/medical-assessments` | Create assessment |
| GET | `/api/medical-assessments/:id` | Get assessment |
| PUT | `/api/medical-assessments/:id` | Update assessment |
| DELETE | `/api/medical-assessments/:id` | Delete assessment |

Query Parameters:
- `patient_id` - Filter by patient
- `location_id` - Filter by location
- `followup_type` - Filter by followup type
- `start_date` - Filter from date
- `end_date` - Filter to date

### Environmental Assessments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/environmental-assessments` | List assessments |
| POST | `/api/environmental-assessments` | Create assessment |
| GET | `/api/environmental-assessments/:id` | Get assessment |
| PUT | `/api/environmental-assessments/:id` | Update assessment |
| DELETE | `/api/environmental-assessments/:id` | Delete assessment |

### Locations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations` | List locations |
| POST | `/api/locations` | Create location |
| GET | `/api/locations/:id` | Get location |
| PUT | `/api/locations/:id` | Update location |
| DELETE | `/api/locations/:id` | Delete location |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Dashboard & Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |
| GET | `/api/export/medical` | Export medical assessments (Excel) |
| GET | `/api/export/environmental` | Export environmental assessments |
| GET | `/api/export/patients` | Export patients data |
| GET | `/api/export/all` | Export all data |

## 🗄 Database Schema

### users
- `id` UUID PRIMARY KEY
- `username` VARCHAR UNIQUE
- `password` VARCHAR (hashed)
- `full_name` VARCHAR
- `email` VARCHAR
- `phone` VARCHAR
- `nip` VARCHAR
- `role` ENUM('super_admin', 'petugas')
- `puskesmas` VARCHAR
- `profile_photo` VARCHAR
- `is_active` BOOLEAN
- `last_login` TIMESTAMP
- timestamps

### patients
- `id` UUID PRIMARY KEY
- `nik` VARCHAR(16) UNIQUE
- `full_name` VARCHAR
- `gender` ENUM('Laki-laki', 'Perempuan')
- `birth_date` DATE
- `birth_place` VARCHAR
- `age_group` ENUM('Balita', 'Anak', 'Dewasa', 'Lansia', 'Ibu Hamil')
- `religion` VARCHAR
- `occupation` VARCHAR
- `address` TEXT
- `phone` VARCHAR
- `location_id` UUID FK
- `created_by` UUID FK
- timestamps

### locations
- `id` UUID PRIMARY KEY
- `name` VARCHAR
- `type` VARCHAR
- `desa` VARCHAR
- `rt` VARCHAR
- `rw` VARCHAR
- `latitude` DECIMAL
- `longitude` DECIMAL
- `capacity` INTEGER
- `current_population` INTEGER
- `description` TEXT
- timestamps

### medical_assessments
- `id` UUID PRIMARY KEY
- `patient_id` UUID FK
- `location_id` UUID FK
- `visit_date` DATE
- `visit_time` TIME
- `anamnesis_type` VARCHAR
- `chief_complaint` TEXT
- `medical_history` TEXT
- `allergy_history` TEXT
- `gcs_*` fields
- `vital_*` fields
- `exam_*` fields (physical examination)
- `supporting_*` fields
- `diagnosis` TEXT
- `treatment` TEXT
- `medication` TEXT
- `followup_type` VARCHAR
- `referral_*` fields
- `kie_*` fields
- `created_by` UUID FK
- timestamps

### environmental_assessments
- `id` UUID PRIMARY KEY
- `location_id` UUID FK
- `assessment_date` DATE
- `water_access` VARCHAR
- `water_source` VARCHAR
- `sanitation_quality` VARCHAR
- `sanitation_notes` TEXT
- `housing_condition` TEXT
- `photos` JSONB
- `need_*` fields
- `additional_notes` TEXT
- `created_by` UUID FK
- timestamps

## 🔐 Authentication

JWT-based authentication:

1. Login with username/password
2. Receive JWT token
3. Include token in Authorization header:
   ```
   Authorization: Bearer <token>
   ```
4. Token expires based on `JWT_EXPIRES_IN` config

## 📤 File Uploads

- Profile photos: `/uploads/profiles/`
- Assessment photos: `/uploads/assessments/`
- Max file size: 5MB
- Allowed types: JPEG, PNG, WebP

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🐳 Docker

```bash
# Build image
docker build -t sirina-backend .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_NAME=sirina_indonesia \
  sirina-backend
```

## 📝 License

Copyright © 2024 SIRINA Indonesia
