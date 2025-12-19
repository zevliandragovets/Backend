import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import prisma from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // CRITICAL untuk Railway!

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'SIRANA-Indonesia API',
    version: '1.0.0',
    description: 'Sistem Informasi Surveilans Pasca-Bencana - Indonesia',
    documentation: '/api/health',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // CRITICAL: Listen on 0.0.0.0 untuk Railway
    app.listen(PORT, HOST, () => {
      console.log('=================================');
      console.log('✅ SIRANA-Indonesia API Started');
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🌐 Host: ${HOST}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Local: http://localhost:${PORT}`);
      console.log(`🔗 Public: https://backend-production-1025.up.railway.app`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
