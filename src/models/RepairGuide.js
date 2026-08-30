const mongoose = require('mongoose');
const { Schema } = mongoose;

const RepairGuideSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true, index: true },
    problemCategory: {
      type: String,
      enum: ['display', 'battery', 'charging_port', 'motherboard', 'water_damage', 'software', 'camera', 'speaker'],
      required: true,
      index: true,
    },
    summary: { type: String, required: true },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        warning: { type: String },
      },
    ],
    videoS3Key: { type: String },
    schematicPdfS3Key: { type: String },
    videoCloudinaryId: { type: String },
    schematicCloudinaryId: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'medium' },
    isPremium: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RepairGuideSchema.index({ brand: 1, model: 1, problemCategory: 1 });

const RepairGuide = mongoose.model('RepairGuide', RepairGuideSchema);

module.exports = { RepairGuide };
