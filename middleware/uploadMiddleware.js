const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif|pdf|docx|txt|zip|webm|mp3|wav|ogg|m4a|aac|mp4|audio/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
  const mimetype = allowedTypes.test(file.mimetype.toLowerCase()) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/');

  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new Error('Unsupported file type. Only images, audio, and documents are allowed.'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

module.exports = upload;
