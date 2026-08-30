const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['broadcast', 'direct'], default: 'broadcast' },
    targetShopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    priority: { type: String, enum: ['info', 'warning', 'promo'], default: 'info' },
  },
  { timestamps: true }
);

NotificationSchema.index({ targetShopId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = { Notification };
