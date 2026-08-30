const { Queue } = require('bullmq');
const { config } = require('../config/env');
const { fast2smsService } = require('../services/fast2sms');
const { Order } = require('../models/Order');

let smsQueue = null;

try {
  smsQueue = new Queue('sms-notifications', {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
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

  smsQueue.on('error', () => {
    // Suppress unhandled redis connection errors for bullmq queue when offline
  });
} catch {
  smsQueue = null;
}

const processSmsJob = async (data) => {
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

const enqueueSmsNotification = async (data) => {
  // Direct asynchronous execution fallback
  setImmediate(async () => {
    try {
      await processSmsJob(data);
    } catch (err) {
      console.error('Async SMS execution error:', err);
    }
  });
};

module.exports = {
  smsQueue,
  enqueueSmsNotification,
  processSmsJob,
};
