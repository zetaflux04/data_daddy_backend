const mongoose = require('mongoose');
const { Schema } = mongoose;

const ShopSchema = new Schema(
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

const Shop = mongoose.model('Shop', ShopSchema);

module.exports = { Shop };
