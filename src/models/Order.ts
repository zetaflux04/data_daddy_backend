import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment {
  amount: number;
  mode: 'cash' | 'upi' | 'card' | 'online';
  transactionRef?: string;
  paidAt: Date;
}

export interface ISmsLog {
  type: 'order_received' | 'repaired' | 'delivered';
  status: 'sent' | 'failed' | 'simulated';
  providerRef?: string;
  sentAt: Date;
}

export interface IWarranty {
  hasWarranty: boolean;
  period?: number;
  unit?: 'days' | 'months' | 'years';
  expiresAt?: Date;
}

export interface IOrder {
  shopId: Types.ObjectId;
  jobId: string; // e.g. "JOB-1001"
  customerId: Types.ObjectId;
  customerSnapshot: {
    name: string;
    phone: string;
  };
  deviceType: 'mobile' | 'laptop' | 'tablet' | 'smartwatch' | 'other';
  brand: string;
  model: string;
  serialOrImei?: string;
  passcodePattern?: string;
  problemDescription: string;
  status: 'pending' | 'in_progress' | 'parts_delayed' | 'repaired' | 'delivered' | 'canceled';
  assignedTechnicianId?: Types.ObjectId;
  cost: {
    estimated: number;
    final: number;
    advancePaid: number;
    due: number;
  };
  warranty?: IWarranty;
  payments: IPayment[];
  smsLogs: ISmsLog[];
  dates: {
    receivedAt: Date;
    promisedDeliveryAt?: Date;
    deliveredAt?: Date;
  };
  invoice: {
    invoiceNumber?: string;
    pdfUrl?: string;
    issuedAt?: Date;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSubSchema = new Schema<IPayment>(
  {
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['cash', 'upi', 'card', 'online'], default: 'cash' },
    transactionRef: { type: String },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SmsLogSubSchema = new Schema<ISmsLog>(
  {
    type: { type: String, enum: ['order_received', 'repaired', 'delivered'], required: true },
    status: { type: String, enum: ['sent', 'failed', 'simulated'], default: 'sent' },
    providerRef: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WarrantySubSchema = new Schema<IWarranty>(
  {
    hasWarranty: { type: Boolean, default: false },
    period: { type: Number },
    unit: { type: String, enum: ['days', 'months', 'years'] },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    jobId: { type: String, required: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'laptop', 'tablet', 'smartwatch', 'other'],
      default: 'mobile',
    },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    serialOrImei: { type: String, trim: true },
    passcodePattern: { type: String },
    problemDescription: { type: String, required: true, trim: true },
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

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
