import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  shopId: Types.ObjectId;
  name: string;
  phone: string;
  role: 'owner' | 'technician' | 'staff';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    role: { type: String, enum: ['owner', 'technician', 'staff'], default: 'owner' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ shopId: 1, phone: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', UserSchema);
