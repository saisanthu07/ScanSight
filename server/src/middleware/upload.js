const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/dicom',
  'application/octet-stream', // .dcm, .nii
  'application/x-compressed',
  'application/gzip',
];

const ALLOWED_EXTENSIONS = ['.dcm', '.nii', '.gz', '.png', '.jpg', '.jpeg'];

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'scans');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename to prevent path traversal
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '';
    cb(null, `scan_${randomName}${sanitizedExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Check extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE', `File type ${ext} not allowed.`),
      false
    );
  }

  // Sanitize original filename
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  file.originalname = sanitizedName;

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
    files: 1,
    fields: 10,
  },
});

// Memory storage for temporary processing
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for memory
    files: 1,
  },
});

module.exports = { upload, memoryUpload };
