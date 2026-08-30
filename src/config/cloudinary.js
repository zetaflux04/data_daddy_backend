const { v2: cloudinary } = require('cloudinary');
const { config } = require('./env');

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

/**
 * Generate secure / delivery URL for Cloudinary assets
 * (Drop-in replacement for AWS S3 pre-signed download URLs)
 */
const getPresignedDownloadUrl = async (publicIdOrKey, expiresInSeconds = 3600) => {
  // If it's already a full valid URL, return directly
  if (!publicIdOrKey) return '';
  if (publicIdOrKey.startsWith('http://') || publicIdOrKey.startsWith('https://')) {
    return publicIdOrKey;
  }

  if (config.cloudinary.apiKey === 'mock_cloudinary_key' || config.cloudinary.cloudName === 'demo') {
    // In demo/mock mode, return a formatted Cloudinary asset delivery URL
    const cleanPath = publicIdOrKey.replace(/^\/+/, '');
    return `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/${cleanPath}`;
  }

  // Generate secure Cloudinary delivery URL
  try {
    const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(publicIdOrKey);
    const isPdf = /\.pdf$/i.test(publicIdOrKey);
    const resourceType = isVideo ? 'video' : isPdf ? 'raw' : 'image';

    const url = cloudinary.url(publicIdOrKey, {
      resource_type: resourceType,
      secure: true,
      sign_url: config.cloudinary.apiSecret !== 'mock_cloudinary_secret',
    });

    return url;
  } catch (error) {
    return `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/${publicIdOrKey}`;
  }
};

/**
 * Generate pre-signed parameters / URL for direct client-side uploads to Cloudinary
 * (Drop-in replacement for AWS S3 pre-signed upload URLs)
 */
const getPresignedUploadUrl = async (publicId, contentType = 'image/jpeg', expiresInSeconds = 900) => {
  if (config.cloudinary.apiKey === 'mock_cloudinary_key') {
    return `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/auto/upload`;
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      public_id: publicId,
      timestamp: timestamp,
    },
    config.cloudinary.apiSecret
  );

  return `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/auto/upload?api_key=${config.cloudinary.apiKey}&timestamp=${timestamp}&signature=${signature}&public_id=${encodeURIComponent(publicId)}`;
};

/**
 * Upload a file/buffer directly to Cloudinary
 */
const uploadToCloudinary = async (file, options = {}) => {
  return await cloudinary.uploader.upload(file, {
    folder: 'repairshop',
    resource_type: 'auto',
    ...options,
  });
};

module.exports = {
  cloudinary,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  uploadToCloudinary,
};
