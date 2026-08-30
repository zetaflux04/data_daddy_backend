import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_repairshop_2025',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/repairshop',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  fast2sms: {
    apiKey: process.env.FAST2SMS_API_KEY || 'mock',
    route: process.env.FAST2SMS_ROUTE || 'q', // 'otp', 'dlt', or 'q' (quick)
    senderId: process.env.FAST2SMS_SENDER_ID || 'TXTIND',
    entityId: process.env.FAST2SMS_ENTITY_ID || '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret',
  },
  /*
  // AWS S3 Configuration (Temporarily disabled - switching to Cloudinary)
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock_aws_key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock_aws_secret',
    bucketName: process.env.AWS_S3_BUCKET_NAME || 'repairshop-manager-storage',
  },
  */
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    apiKey: process.env.CLOUDINARY_API_KEY || 'mock_cloudinary_key',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'mock_cloudinary_secret',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@datadaddy.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};
