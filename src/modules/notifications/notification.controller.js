const { Notification } = require('../../models/Notification');
const mongoose = require('mongoose');

const notificationController = {
  /**
   * Get Notifications for the Logged-in Shop
   * GET /api/notifications
   */
  async getShopNotifications(req, res) {
    try {
      const shopId = req.user?.shopId;
      const filter = {
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
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = { notificationController };
