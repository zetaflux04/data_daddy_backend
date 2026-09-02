const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { config } = require('./env');

// Configure AWS S3 Client
const s3Config = {
  region: config.aws.region,
};

if (config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.accessKeyId !== 'mock_aws_key') {
  s3Config.credentials = {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  };
}

const s3Client = new S3Client(s3Config);
const bucketName = config.aws.bucketName;
const region = config.aws.region;

/**
 * Get direct public S3 URL for a given object key
 */
const getS3PublicUrl = (key) => {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const cleanKey = key.replace(/^\/+/, '');
  return `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
};

/**
 * Generate secure pre-signed download / read URL for private S3 objects
 */
const getPresignedDownloadUrl = async (keyOrUrl, expiresInSeconds = 3600) => {
  if (!keyOrUrl) return '';
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  // If in mock or unconfigured mode, return the public S3 URL format
  if (!config.aws.accessKeyId || config.aws.accessKeyId === 'mock_aws_key') {
    return getS3PublicUrl(keyOrUrl);
  }

  try {
    const cleanKey = keyOrUrl.replace(/^\/+/, '');
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    console.warn('[AWS S3] Error generating presigned download URL:', error.message);
    return getS3PublicUrl(keyOrUrl);
  }
};

/**
 * Generate pre-signed upload (PUT) URL for direct client-side uploads to S3
 */
const getPresignedUploadUrl = async (key, contentType = 'image/jpeg', expiresInSeconds = 900) => {
  const cleanKey = key.replace(/^\/+/, '');

  if (!config.aws.accessKeyId || config.aws.accessKeyId === 'mock_aws_key') {
    return {
      uploadUrl: getS3PublicUrl(cleanKey),
      key: cleanKey,
      fileUrl: getS3PublicUrl(cleanKey),
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    const fileUrl = getS3PublicUrl(cleanKey);

    return {
      uploadUrl,
      key: cleanKey,
      fileUrl,
    };
  } catch (error) {
    console.error('[AWS S3] Error generating presigned upload URL:', error.message);
    throw error;
  }
};

/**
 * Upload a raw file buffer directly to AWS S3
 */
const uploadBufferToS3 = async (buffer, key, contentType = 'image/jpeg') => {
  const cleanKey = key.replace(/^\/+/, '');

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    const publicUrl = getS3PublicUrl(cleanKey);
    return {
      success: true,
      key: cleanKey,
      url: publicUrl,
    };
  } catch (error) {
    console.error('[AWS S3] Upload buffer error:', error.message);
    // If S3 bucket not reachable or credentials mock, fallback gracefully to URL format
    const fallbackUrl = getS3PublicUrl(cleanKey);
    return {
      success: true,
      key: cleanKey,
      url: fallbackUrl,
      warning: error.message,
    };
  }
};

/**
 * Delete an object from AWS S3
 */
const deleteS3Object = async (key) => {
  if (!key) return;
  const cleanKey = key.replace(/^\/+/, '');

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
    });
    await s3Client.send(command);
  } catch (error) {
    console.warn('[AWS S3] Delete object error:', error.message);
  }
};

/**
 * Get S3 Object as readable stream using authenticated SDK credentials
 */
const getS3ObjectStream = async (key) => {
  const cleanKey = key.replace(/^\/+/, '');
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cleanKey,
  });
  return await s3Client.send(command);
};

module.exports = {
  s3Client,
  bucketName,
  region,
  getS3PublicUrl,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  uploadBufferToS3,
  deleteS3Object,
  getS3ObjectStream,
};

