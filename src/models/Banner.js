const mongoose = require('mongoose');
const { Schema } = mongoose;

const BannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    tag: { type: String, default: 'PROMOTION' },
    tagBg: { type: String, default: 'rgba(255, 255, 255, 0.2)' },
    tagColor: { type: String, default: '#FFFFFF' },
    ctaText: { type: String, default: 'Explore Now' },
    ctaRoute: { type: String, default: '' },
    gradientColors: {
      type: [String],
      default: ['#4F46E5', '#7C3AED'],
    },
    badgeIcon: { type: String, default: 'gift' },
    badgeBg: { type: String, default: '#FFFFFF' },
    imageUrl: { type: String, default: '' },
    targetPlatform: {
      type: String,
      enum: ['all', 'mobile', 'website'],
      default: 'all',
    },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BannerSchema.index({ isActive: 1, targetPlatform: 1, displayOrder: 1 });

const Banner = mongoose.model('Banner', BannerSchema);

module.exports = { Banner };
