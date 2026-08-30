import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { AdminRequest } from './admin.middleware';

export const adminAuthController = {
  /**
   * Super Admin Login
   * POST /api/admin/auth/login
   * Body: { email, password }
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const expectedEmail = config.admin.email.trim().toLowerCase();
    const expectedPassword = config.admin.password;

    // Check credentials (also allow admin/admin or admin@datadaddy.com/admin123)
    const isMatch =
      (trimmedEmail === expectedEmail && password === expectedPassword) ||
      (trimmedEmail === 'admin@datadaddy.com' && password === 'admin123') ||
      (trimmedEmail === 'admin' && password === 'admin');

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrator email or password',
      });
      return;
    }

    const tokenPayload = {
      userId: 'admin_super_01',
      email: trimmedEmail,
      role: 'superadmin',
      name: 'Master Platform Admin',
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    res.json({
      success: true,
      message: 'Superadmin authenticated successfully',
      token,
      admin: {
        id: tokenPayload.userId,
        email: tokenPayload.email,
        name: tokenPayload.name,
        role: tokenPayload.role,
      },
    });
  },

  /**
   * Get Current Super Admin Session
   * GET /api/admin/auth/me
   */
  async getMe(req: AdminRequest, res: Response): Promise<void> {
    res.json({
      success: true,
      admin: req.admin,
    });
  },
};
