import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  name: string;
  ownerName: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  logoUrl?: string;
  subscription: {
    plan: 'free' | 'pro';
    status: 'active' | 'expired' | 'canceled';
    expiresAt?: Date;
    razorpaySubscriptionId?: string;
  };
  settings: {
    currency: string;
    smsNotificationsEnabled: boolean;
    nextJobNumber: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    logoUrl: { type: String },
    subscription: {
      plan: { type: String, enum: ['free', 'pro'], default: 'free' },
      status: { type: String, enum: ['active', 'expired', 'canceled'], default: 'active' },
      expiresAt: { type: Date },
      razorpaySubscriptionId: { type: String },
    },
    settings: {
      currency: { type: String, default: 'INR' },
      smsNotificationsEnabled: { type: Boolean, default: true },
      nextJobNumber: { type: Number, default: 1001 },
    },
  },
  { timestamps: true }
);

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
