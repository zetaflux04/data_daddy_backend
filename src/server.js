const app = require('./app');
const { config } = require('./config/env');
const { connectDB } = require('./config/db');
const { getRedisClient } = require('./config/redis');
const { seedTestUser } = require('./config/seed');

const startServer = async () => {
  await connectDB();
  await seedTestUser();
  getRedisClient();

  const server = app.listen(config.port, () => {
    console.log(`🚀 RepairShop Manager Backend running on port ${config.port} [${config.nodeEnv}]`);
    console.log(`📡 Fast2SMS Mode: ${config.fast2sms.apiKey === 'mock' ? 'MOCK SIMULATION (Console logs)' : 'LIVE GATEWAY'}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${config.port} is already in use. Please close the duplicate running process.`);
    } else {
      console.error('❌ Server error:', err);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
