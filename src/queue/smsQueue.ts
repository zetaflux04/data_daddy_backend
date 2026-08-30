import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config/env';
import { fast2smsService } from '../services/fast2sms';
import { Order } from '../models/Order';

export interface SmsJobData {
  orderId: string;
  phone: string;
  type: 'order_received' | 'repaired' | 'delivered';
  jobId: string;
  customerName: string;
  shopName: string;
  shopPhone?: string;
  amountDue?: number;
}

let smsQueue: Queue<SmsJobData> | null = null;

try {
  smsQueue = new Queue<SmsJobData>('sms-notifications', {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    },
  });
} catch {
  smsQueue = null;
}

export const enqueueSmsNotification = async (data: SmsJobData): Promise<void> => {
  try {
    if (smsQueue) {
      await smsQueue.add('send-job-sms', data);
      return;
    }
  } catch {
    // Redis offline or queue error, fall through to direct async dispatch
  }

  // Fallback: direct asynchronous execution
  setImmediate(async () => {
    try {
      await processSmsJob(data);
    } catch (err) {
      console.error('Async SMS fallback execution error:', err);
    }
  });
};

export const processSmsJob = async (data: SmsJobData): Promise<void> => {
  const result = await fast2smsService.sendJobStatusSms({
    phone: data.phone,
    type: data.type,
    jobId: data.jobId,
    customerName: data.customerName,
    shopName: data.shopName,
    shopPhone: data.shopPhone,
    amountDue: data.amountDue,
  });

  // Record delivery status on the order document
  try {
    await Order.findByIdAndUpdate(data.orderId, {
      $push: {
        smsLogs: {
          type: data.type,
          status: result.success ? 'sent' : 'failed',
          providerRef: result.message,
          sentAt: new Date(),
        },
      },
    });
  } catch (err) {
    console.error('Failed to log SMS status to Order:', err);
  }
};
