const path = require('path');
const { uploadBufferToS3, getPresignedUploadUrl, getS3ObjectStream } = require('../../config/s3');
const { Shop } = require('../../models/Shop');
const { User } = require('../../models/User');

const uploadController = {
  /**
   * Upload Profile Photo / Shop Logo to AWS S3
   * POST /api/uploads/profile
   */
  async uploadProfile(req, res) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
      }

      const file = req.file;
      const fileExt = path.extname(file.originalname) || '.jpg';
      const cleanFileName = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
      const shopIdentifier = req.user?.shopId ? String(req.user.shopId) : 'guest';
      const s3Key = `profiles/${shopIdentifier}/${Date.now()}_${cleanFileName}${fileExt}`;

      const uploadResult = await uploadBufferToS3(file.buffer, s3Key, file.mimetype);

      // If user is authenticated, automatically update the shop and user profile
      if (req.user?.shopId) {
        await Shop.findByIdAndUpdate(req.user.shopId, {
          logoUrl: uploadResult.url,
        });
      }

      if (req.user?.userId) {
        await User.findByIdAndUpdate(req.user.userId, {
          avatarUrl: uploadResult.url,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile photo uploaded to AWS S3 successfully',
        url: uploadResult.url,
        key: uploadResult.key,
      });
    } catch (error) {
      console.error('[UploadController] Profile upload error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to upload image to AWS S3' });
    }
  },

  /**
   * General Image Upload to AWS S3 (for Banners, Repair Photos, Documents)
   * POST /api/uploads/image
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
      }

      const file = req.file;
      const folder = (req.body.folder || req.query.folder || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileExt = path.extname(file.originalname) || '.jpg';
      const cleanFileName = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
      const s3Key = `${folder}/${Date.now()}_${cleanFileName}${fileExt}`;

      const uploadResult = await uploadBufferToS3(file.buffer, s3Key, file.mimetype);

      res.status(200).json({
        success: true,
        message: 'File uploaded to AWS S3 successfully',
        url: uploadResult.url,
        key: uploadResult.key,
      });
    } catch (error) {
      console.error('[UploadController] Image upload error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to upload image to AWS S3' });
    }
  },

  /**
   * Generate Pre-Signed S3 Upload URL for direct client-side S3 PUT
   * GET /api/uploads/presigned-url
   */
  async getPresignedUpload(req, res) {
    try {
      const { fileName, fileType, folder = 'uploads' } = req.query;

      if (!fileName || !fileType) {
        res.status(400).json({ success: false, message: 'fileName and fileType query parameters are required' });
        return;
      }

      const fileExt = path.extname(fileName) || '.jpg';
      const cleanFileName = path.basename(fileName, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
      const s3Key = `${cleanFolder}/${Date.now()}_${cleanFileName}${fileExt}`;

      const result = await getPresignedUploadUrl(s3Key, fileType, 900);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('[UploadController] Presigned URL error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to generate S3 pre-signed upload URL' });
    }
  },

  /**
   * Stream / Proxy S3 Media to client with immutable caching
   * GET /api/uploads/media/* OR GET /api/uploads/media?key=...
   */
  async serveMedia(req, res) {
    try {
      let key = req.query.key || req.query.url || req.params[0] || req.params.key;

      if (!key) {
        res.status(400).json({ success: false, message: 'File key or url query parameter is required' });
        return;
      }

      key = decodeURIComponent(key);

      // Extract S3 object key if a full S3 URL was passed
      if (key.includes('.amazonaws.com/')) {
        key = key.split('.amazonaws.com/')[1];
      } else if (key.startsWith('http://') || key.startsWith('https://')) {
        try {
          const parsed = new URL(key);
          key = parsed.pathname.replace(/^\/+/, '');
          if (key.startsWith('api/uploads/media/')) {
            key = key.replace('api/uploads/media/', '');
          }
        } catch {}
      }

      key = key.replace(/^\/+/, '');

      const s3Response = await getS3ObjectStream(key);
      if (!s3Response || !s3Response.Body) {
        res.status(404).json({ success: false, message: 'Image or file not found in AWS S3' });
        return;
      }

      if (s3Response.ContentType) {
        res.setHeader('Content-Type', s3Response.ContentType);
      }
      if (s3Response.ContentLength) {
        res.setHeader('Content-Length', s3Response.ContentLength);
      }
      if (s3Response.ETag) {
        res.setHeader('ETag', s3Response.ETag);
      }
      if (s3Response.LastModified) {
        res.setHeader('Last-Modified', new Date(s3Response.LastModified).toUTCString());
      }

      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      s3Response.Body.pipe(res);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        res.status(404).json({ success: false, message: 'File not found in S3' });
      } else {
        console.error('[UploadController] Serve media error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to retrieve media from AWS S3' });
      }
    }
  },
};

module.exports = { uploadController };

