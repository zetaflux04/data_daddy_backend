import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubscription extends Document {
  shopId: Types.ObjectId;
  planType: 'pro_monthly' | 'pro_yearly';
  amount: number;
  startDate: Date;
  endDate: Date;
  paymentStatus: 'pending' | 'completed' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    planType: { type: String, enum: ['pro_monthly', 'pro_yearly'], required: true },
    amount: { type: Number, required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
