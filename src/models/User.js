const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    role: { type: String, enum: ['owner', 'technician', 'staff'], default: 'owner' },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ shopId: 1, phone: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);

module.exports = { User };
