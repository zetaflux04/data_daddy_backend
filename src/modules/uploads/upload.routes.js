const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { config } = require('../../config/env');
const { uploadController } = require('./upload.controller');

const router = express.Router();

// Configure Multer for memory storage (max 15MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images, pdfs, videos
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype.startsWith('video/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and video formats are allowed'));
    }
  },
});

// Optional JWT extraction helper
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch {
      // ignore invalid token in optional auth
    }
  }
  next();
};

// Profile Photo / Shop Logo Upload to AWS S3
router.post('/profile', optionalAuth, upload.single('image'), uploadController.uploadProfile);

// Generic Media / Document Upload to AWS S3
router.post('/image', optionalAuth, upload.single('image'), uploadController.uploadImage);

// Pre-Signed S3 Upload URL Generation
router.get('/presigned-url', optionalAuth, uploadController.getPresignedUpload);

// Stream / Proxy S3 Media (Publicly accessible with fast caching)
router.get('/media', uploadController.serveMedia);
router.get('/media/*', uploadController.serveMedia);
router.get('/view/*', uploadController.serveMedia);

module.exports = router;

