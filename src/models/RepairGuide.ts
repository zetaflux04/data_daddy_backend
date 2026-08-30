import mongoose, { Schema, Document } from 'mongoose';

export interface IRepairGuide {
  title: string;
  brand: string;
  model: string;
  problemCategory: 'display' | 'battery' | 'charging_port' | 'motherboard' | 'water_damage' | 'software' | 'camera' | 'speaker';
  summary: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    warning?: string;
  }>;
  // Media keys (Cloudinary public ID / asset path or legacy AWS S3 key)
  videoS3Key?: string;
  schematicPdfS3Key?: string;
  videoCloudinaryId?: string;
  schematicCloudinaryId?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RepairGuideSchema = new Schema<IRepairGuide>(
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

export const RepairGuide = mongoose.model<IRepairGuide>('RepairGuide', RepairGuideSchema);
