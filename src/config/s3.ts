/**
 * AWS S3 Configuration (TEMPORARILY COMMENTED OUT - Switched to Cloudinary)
 * 
 * Re-enable this file when AWS issues are resolved.
 */

/*
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './env';

export const s3Client = new S3Client({
  region: config.aws?.region,
  credentials: {
    accessKeyId: config.aws?.accessKeyId,
    secretAccessKey: config.aws?.secretAccessKey,
  },
});

export const getPresignedDownloadUrlAWS = async (
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> => {
  if (config.aws?.accessKeyId === 'mock_aws_key') {
    return `https://demo-cdn.repairshopmanager.com/media/${encodeURIComponent(key)}?expires=${Date.now() + expiresInSeconds * 1000}`;
  }

  const command = new GetObjectCommand({
    Bucket: config.aws?.bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

export const getPresignedUploadUrlAWS = async (
  key: string,
  contentType: string,
  expiresInSeconds: number = 900
): Promise<string> => {
  if (config.aws?.accessKeyId === 'mock_aws_key') {
    return `https://demo-cdn.repairshopmanager.com/upload/${encodeURIComponent(key)}`;
  }

  const command = new PutObjectCommand({
    Bucket: config.aws?.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};
*/

// Re-export Cloudinary implementation as replacement
export {
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  uploadToCloudinary,
  cloudinary,
} from './cloudinary';
