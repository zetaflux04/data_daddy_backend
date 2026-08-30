const app = require('./app');
const { config } = require('./config/env');
const { connectDB } = require('./config/db');
const { getRedisClient } = require('./config/redis');
const { seedTestUser } = require('./config/seed');

const startServer = async () => {
  await connectDB();
  await seedTestUser();
  getRedisClient();

  app.listen(config.port, () => {
    console.log(`🚀 RepairShop Manager Backend running on port ${config.port} [${config.nodeEnv}]`);
    console.log(`📡 Fast2SMS Mode: ${config.fast2sms.apiKey === 'mock' ? 'MOCK SIMULATION (Console logs)' : 'LIVE GATEWAY'}`);
  });
};

startServer();
