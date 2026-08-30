import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'broadcast' | 'direct';
  targetShopId?: Types.ObjectId;
  priority: 'info' | 'warning' | 'promo';
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
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

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
