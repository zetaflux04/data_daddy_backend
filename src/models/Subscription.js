const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubscriptionSchema = new Schema(
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

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = { Subscription };
