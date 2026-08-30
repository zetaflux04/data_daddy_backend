import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Types } from 'mongoose';

export interface AuthUser {
  userId: string;
  shopId: string;
  role: 'owner' | 'technician' | 'staff';
  phone: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticateJwt = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. Missing token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};

export const requireRole = (allowedRoles: Array<'owner' | 'technician' | 'staff'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Requires one of: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};
