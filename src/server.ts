import app from './app';
import { config } from './config/env';
import { connectDB } from './config/db';
import { getRedisClient } from './config/redis';

const startServer = async () => {
  await connectDB();
  getRedisClient();

  app.listen(config.port, () => {
    console.log(`🚀 RepairShop Manager Backend running on port ${config.port} [${config.nodeEnv}]`);
    console.log(`📡 Fast2SMS Mode: ${config.fast2sms.apiKey === 'mock' ? 'MOCK SIMULATION (Console logs)' : 'LIVE GATEWAY'}`);
  });
};

startServer();
