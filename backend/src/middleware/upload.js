const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Configure disk storage for private uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploads.directory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `wound_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP image files are permitted.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxFileSize
  },
  fileFilter
});

module.exports = upload;
