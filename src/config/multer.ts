import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

// Ensure upload directory exists
const ensureUploadDir = (subDir: string = '') => {
  const dir = path.join(UPLOAD_DIR, subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Storage configuration
const createStorage = (subDir: string = '') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = ensureUploadDir(subDir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
};

// File filter
const imageFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WEBP)'));
  }
};

// Export configured multer instances
export const uploadProfilePhoto = multer({
  storage: createStorage('profiles'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter,
}).single('foto');

export const uploadEnvironmentPhotos = multer({
  storage: createStorage('environments'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter,
}).array('photos', 10); // Max 10 photos

export const getFileUrl = (filename: string, subDir: string = ''): string => {
  return `/uploads/${subDir}${subDir ? '/' : ''}${filename}`;
};

export const deleteFile = (filepath: string): boolean => {
  try {
    const fullPath = path.join(UPLOAD_DIR, filepath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

export default {
  uploadProfilePhoto,
  uploadEnvironmentPhotos,
  getFileUrl,
  deleteFile,
  UPLOAD_DIR,
};
