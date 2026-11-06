const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || process.env.NODE_ENV === 'production';

let storage;

if (isVercel) {
  // On Vercel serverless functions, local disk is read-only.
  // Use memoryStorage so controllers can store files directly into MongoDB as Data URLs.
  storage = multer.memoryStorage();
} else {
  // Ensure local upload directory exists
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      const cleanBaseName = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);
      cb(null, `${cleanBaseName}-${uniqueSuffix}${ext}`);
    },
  });
}

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type (${file.mimetype}). Allowed types: Images and Documents.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter,
});

module.exports = upload;
