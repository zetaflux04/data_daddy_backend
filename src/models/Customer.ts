import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  shopId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrdersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
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

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
