import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully to:', config.mongodb.uri);
  } catch (error) {
    console.error('⚠️ MongoDB connection error:', (error as Error).message);
    console.warn('Backend is running; ensure MongoDB is running or check MONGODB_URI in .env');
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});
