import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { Notification } from '../../models/Notification';
import mongoose from 'mongoose';

export const notificationController = {
  /**
   * Get Notifications for the Logged-in Shop
   * GET /api/notifications
   */
  async getShopNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const shopId = req.user?.shopId;
      const filter: any = {
        $or: [
          { type: 'broadcast' },
          ...(shopId ? [{ targetShopId: new mongoose.Types.ObjectId(shopId) }] : []),
        ],
      };

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({ success: true, notifications });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },
};
