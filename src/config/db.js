const mongoose = require('mongoose');
const { config } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully to:', config.mongodb.uri);
  } catch (error) {
    console.error('⚠️ MongoDB connection error:', error.message);
    console.warn('Backend is running; ensure MongoDB is running or check MONGODB_URI in .env');
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

module.exports = { connectDB };
