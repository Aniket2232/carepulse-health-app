import Redis from 'ioredis';
import { ENV } from './env.js';

class MemoryStorageAdapter {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, ttlSeconds) {
    const expiresAt = (mode === 'EX' && ttlSeconds) ? Date.now() + (ttlSeconds * 1000) : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }
}

let redisClient = null;
let isRedisConnected = false;
const memoryFallback = new MemoryStorageAdapter();

if (ENV.REDIS_URL && ENV.REDIS_URL.trim() !== '') {
  try {
    redisClient = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 3000,
      tls: ENV.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Connected to Redis (Upstash) storage successfully');
    });

    redisClient.on('error', (err) => {
      if (!isRedisConnected) {
        console.warn('⚠️ Unable to connect to Redis. Falling back to in-memory store (not suitable for multi-instance production).');
      }
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization error. Falling back to in-memory store.');
    redisClient = null;
  }
} else {
  console.warn('⚠️ REDIS_URL not configured. Falling back to in-memory store (not suitable for multi-instance production).');
}

export const otpStorage = {
  async get(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch (_) {
        return await memoryFallback.get(key);
      }
    }
    return await memoryFallback.get(key);
  },

  async setEx(key, ttlSeconds, value) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.set(key, value, 'EX', ttlSeconds);
      } catch (_) {
        return await memoryFallback.set(key, value, 'EX', ttlSeconds);
      }
    }
    return await memoryFallback.set(key, value, 'EX', ttlSeconds);
  },

  async del(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.del(key);
      } catch (_) {
        return await memoryFallback.del(key);
      }
    }
    return await memoryFallback.del(key);
  }
};
