import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  shopId: Types.ObjectId;
  category: 'spare_part' | 'rent' | 'salary' | 'utilities' | 'tools' | 'other';
  title: string;
  amount: number;
  note?: string;
  date: Date;
  linkedOrderId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    category: {
      type: String,
      enum: ['spare_part', 'rent', 'salary', 'utilities', 'tools', 'other'],
      default: 'spare_part',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    note: { type: String, default: '' },
    date: { type: Date, default: Date.now, index: true },
    linkedOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

ExpenseSchema.index({ shopId: 1, date: -1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
