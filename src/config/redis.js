const Redis = require('ioredis');
const { config } = require('./env');

let redisClient = null;
let isRedisAvailable = false;
const inMemoryCache = new Map();

const getRedisClient = () => {
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

    redisClient.on('error', () => {
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
const cacheService = {
  async set(key, value, ttlSeconds) {
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

  async get(key) {
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

  async del(key) {
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

module.exports = { getRedisClient, cacheService };
