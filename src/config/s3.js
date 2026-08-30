/**
 * AWS S3 Configuration (TEMPORARILY COMMENTED OUT - Switched to Cloudinary)
 * Re-export Cloudinary implementation as replacement
 */
const {
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  uploadToCloudinary,
  cloudinary,
} = require('./cloudinary');

module.exports = {
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  uploadToCloudinary,
  cloudinary,
};
