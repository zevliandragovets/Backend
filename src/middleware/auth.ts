import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../config/jwt';
import prisma from '../config/database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Method 1: Get token from Authorization header (standard)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Method 2: Get token from query parameter (for browser download/export)
    // This allows exports to work when opened directly in browser
    if (!token && req.query.authToken) {
      token = req.query.authToken as string;
      console.log('Using token from query parameter for export');
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan.',
      });
      return;
    }

    try {
      const decoded = verifyToken(token);

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User tidak ditemukan.',
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Akun Anda telah dinonaktifkan.',
        });
        return;
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (tokenError) {
      res.status(401).json({
        success: false,
        message: 'Token tidak valid atau sudah kadaluarsa.',
      });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada autentikasi.',
    });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melakukan aksi ini.',
      });
      return;
    }

    next();
  };
};

export const requireSuperAdmin = requireRole('SUPER_ADMIN');
export const requirePetugas = requireRole('PETUGAS', 'SUPER_ADMIN');

export default {
  authenticate,
  requireRole,
  requireSuperAdmin,
  requirePetugas,
};