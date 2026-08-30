import Redis from 'ioredis';
import { config } from './env';

let redisClient: Redis | null = null;
let isRedisAvailable = false;
const inMemoryCache = new Map<string, { value: string; expiry: number }>();

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't crash loop if offline
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      // Suppress unhandled crash if redis is offline locally
    });

    redisClient.connect().catch(() => {
      isRedisAvailable = false;
      console.log('ℹ️ Redis not running locally. Using in-memory fallback for OTP and cache.');
    });
  }

  return redisClient;
};

// Unified Key-Value Helper with in-memory fallback
export const cacheService = {
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        if (ttlSeconds) {
          await redisClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, value);
        }
        return;
      } catch {
        // fallback
      }
    }
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
    inMemoryCache.set(key, { value, expiry });
  },

  async get(key: string): Promise<string | null> {
    if (isRedisAvailable && redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        // fallback
      }
    }
    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      inMemoryCache.delete(key);
      return null;
    }
    return entry.value;
  },

  async del(key: string): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.del(key);
      } catch {
        // fallback
      }
    }
    inMemoryCache.delete(key);
  },
};
