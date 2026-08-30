const { Worker } = require('bullmq');
const { config } = require('./config/env');
const { connectDB } = require('./config/db');
const { processSmsJob } = require('./queue/smsQueue');

const startWorker = async () => {
  await connectDB();

  console.log('👷 SMS & Notification Worker process started...');

  const worker = new Worker(
    'sms-notifications',
    async (job) => {
      console.log(`Processing SMS job #${job.id} for Order ${job.data.jobId} (${job.data.type})`);
      await processSmsJob(job.data);
    },
    {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ SMS job #${job.id} sent successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ SMS job #${job?.id} failed:`, err.message);
  });
};

startWorker();
