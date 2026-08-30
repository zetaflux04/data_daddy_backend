const mongoose = require('mongoose');
const { Schema } = mongoose;

const ExpenseSchema = new Schema(
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

const Expense = mongoose.model('Expense', ExpenseSchema);

module.exports = { Expense };
