const jwt = require('jsonwebtoken');
const { cacheService } = require('../../config/redis');
const { fast2smsService } = require('../../services/fast2sms');
const { Shop } = require('../../models/Shop');
const { User } = require('../../models/User');
const { config } = require('../../config/env');

const authController = {
  /**
   * Request OTP for mobile login
   * POST /api/auth/otp/request
   * Body: { phone: "9876543210" }
   */
  async requestOtp(req, res) {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      res.status(400).json({ success: false, message: 'Please provide a valid 10-digit Indian phone number' });
      return;
    }

    // Handle test user 9876543210
    const isTestNumber = cleanPhone === '9876543210';
    const otp = isTestNumber ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // Cache in Redis / memory for 5 minutes (300 seconds)
    await cacheService.set(`otp:${cleanPhone}`, otp, 300);

    if (isTestNumber) {
      res.json({
        success: true,
        message: 'OTP sent successfully (Test User Code: 123456)',
        devOtp: '123456',
      });
      return;
    }

    // Send via Fast2SMS
    const result = await fast2smsService.sendOtp(cleanPhone, otp);

    res.json({
      success: result.success,
      message: result.message,
      ...(config.fast2sms.apiKey === 'mock' ? { devOtp: otp } : {}),
    });
  },

  /**
   * Verify OTP and Login / Auto-Register
   * POST /api/auth/otp/verify
   * Body: { phone: "9876543210", otp: "123456" }
   */
  async verifyOtp(req, res) {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ success: false, message: 'Phone and OTP are required' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cachedOtp = await cacheService.get(`otp:${cleanPhone}`);

    // Allow test user 9876543210 with static OTP 123456, or mock mode, or valid cached OTP
    const isTestAuth = cleanPhone === '9876543210' && otp === '123456';
    const isValid = isTestAuth || (config.fast2sms.apiKey === 'mock' && otp === '123456') || (cachedOtp && cachedOtp === otp);

    if (!isValid) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
      return;
    }

    // Consume OTP
    if (cachedOtp) {
      await cacheService.del(`otp:${cleanPhone}`);
    }

    // Check if user exists
    let user = await User.findOne({ phone: cleanPhone });
    let shop = null;

    if (user) {
      shop = await Shop.findById(user.shopId);
    }

    // Auto-create test user and shop if not already present
    if (isTestAuth && (!user || !shop)) {
      if (!shop) {
        shop = await Shop.create({
          name: 'OK-Repair Solutions',
          ownerName: 'Sunil Verma',
          phone: '9876543210',
          address: { street: 'Shop #14, Main Market', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
          subscription: {
            plan: 'pro',
            status: 'active',
          },
          settings: {
            currency: 'INR',
            smsNotificationsEnabled: true,
            nextJobNumber: 1001,
          },
        });
      }

      if (!user) {
        user = await User.create({
          shopId: shop._id,
          name: 'Sunil Verma',
          phone: '9876543210',
          role: 'owner',
          isActive: true,
        });
      }
    }

    // If user or shop doesn't exist yet, return needsRegistration flag
    if (!user || !shop) {
      res.json({
        success: true,
        needsRegistration: true,
        phone: cleanPhone,
        message: 'OTP verified. Please complete shop onboarding.',
      });
      return;
    }

    // Issue JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        shopId: shop._id.toString(),
        role: user.role,
        phone: user.phone,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      needsRegistration: false,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        ownerName: shop.ownerName,
        phone: shop.phone,
        plan: shop.subscription.plan,
        subscriptionStatus: shop.subscription.status,
      },
    });
  },

  /**
   * Complete First-Time Registration: Create Shop & Owner User
   * POST /api/auth/register
   * Body: { phone: "9876543210", shopName: "Speedy Repairs", ownerName: "Raj Sharma", address?: {...} }
   */
  async registerShop(req, res) {
    const { phone, shopName, ownerName, address } = req.body;
    if (!phone || !shopName || !ownerName) {
      res.status(400).json({ success: false, message: 'Phone, Shop Name, and Owner Name are required' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // Check if user with phone already registered
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this phone number already exists' });
      return;
    }

    // 1. Create Shop
    const shop = await Shop.create({
      name: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: cleanPhone,
      address: address || {},
      subscription: {
        plan: 'free',
        status: 'active',
      },
      settings: {
        currency: 'INR',
        smsNotificationsEnabled: true,
        nextJobNumber: 1001,
      },
    });

    // 2. Create Owner User
    const user = await User.create({
      shopId: shop._id,
      name: ownerName.trim(),
      phone: cleanPhone,
      role: 'owner',
      isActive: true,
    });

    // 3. Issue Token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        shopId: shop._id.toString(),
        role: user.role,
        phone: user.phone,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        ownerName: shop.ownerName,
        phone: shop.phone,
        plan: shop.subscription.plan,
        subscriptionStatus: shop.subscription.status,
      },
    });
  },
};

module.exports = { authController };
