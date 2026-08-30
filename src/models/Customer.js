const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, default: '' },
    totalOrdersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Optimize fast search for customers within a shop by phone number or name
CustomerSchema.index({ shopId: 1, phone: 1 });
CustomerSchema.index({ shopId: 1, name: 1 });

const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = { Customer };
