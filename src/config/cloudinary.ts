import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { config } from './env';

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

/**
 * Generate secure / delivery URL for Cloudinary assets
 * (Drop-in replacement for AWS S3 pre-signed download URLs)
 */
export const getPresignedDownloadUrl = async (
  publicIdOrKey: string,
  expiresInSeconds: number = 3600
): Promise<string> => {
  // If it's already a full valid URL, return directly
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
export const getPresignedUploadUrl = async (
  publicId: string,
  contentType: string = 'image/jpeg',
  expiresInSeconds: number = 900
): Promise<string> => {
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
export const uploadToCloudinary = async (
  file: string,
  options: UploadApiOptions = {}
): Promise<UploadApiResponse> => {
  return await cloudinary.uploader.upload(file, {
    folder: 'repairshop',
    resource_type: 'auto',
    ...options,
  });
};
