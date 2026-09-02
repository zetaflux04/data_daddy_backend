const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSubSchema = new Schema(
  {
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['cash', 'upi', 'card', 'online'], default: 'cash' },
    transactionRef: { type: String },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SmsLogSubSchema = new Schema(
  {
    type: { type: String, enum: ['order_received', 'repaired', 'delivered'], required: true },
    status: { type: String, enum: ['sent', 'failed', 'simulated'], default: 'sent' },
    providerRef: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WarrantySubSchema = new Schema(
  {
    hasWarranty: { type: Boolean, default: false },
    period: { type: Number },
    unit: { type: String, enum: ['days', 'months', 'years'] },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    jobId: { type: String, required: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    orderType: {
      type: String,
      enum: ['repair', 'accessory'],
      default: 'repair',
      index: true,
    },
    // Repair-specific fields
    deviceType: {
      type: String,
      enum: ['mobile', 'laptop', 'tablet', 'smartwatch', 'other'],
      default: 'mobile',
    },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    serialOrImei: { type: String, trim: true },
    passcodePattern: { type: String },
    problemDescription: { type: String, trim: true },
    photos: [{ type: String }],
    // Accessory-specific fields
    productName: { type: String, trim: true },
    productPrice: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'parts_delayed', 'repaired', 'delivered', 'canceled'],
      default: 'pending',
      index: true,
    },
    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    cost: {
      estimated: { type: Number, default: 0 },
      final: { type: Number, default: 0 },
      advancePaid: { type: Number, default: 0 },
      due: { type: Number, default: 0 },
    },
    warranty: { type: WarrantySubSchema },
    payments: [PaymentSubSchema],
    smsLogs: [SmsLogSubSchema],
    dates: {
      receivedAt: { type: Date, default: Date.now },
      promisedDeliveryAt: { type: Date },
      deliveredAt: { type: Date },
    },
    invoice: {
      invoiceNumber: { type: String },
      pdfUrl: { type: String },
      issuedAt: { type: Date },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

OrderSchema.index({ shopId: 1, jobId: 1 }, { unique: true });
OrderSchema.index({ shopId: 1, status: 1, createdAt: -1 });

const Order = mongoose.model('Order', OrderSchema);

module.exports = { Order };
