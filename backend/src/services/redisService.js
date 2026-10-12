import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isRedisConnected = false;

// Fast fallback in-memory cache with TTL support
class InMemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

const memoryCache = new InMemoryCache();

/**
 * Initialize Redis connection with silent in-memory fallback
 */
export const initRedis = () => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  try {
    redisClient = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // Do not spam retries if Redis is not running
      connectTimeout: 1000
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log(`✅ Redis connected on ${host}:${port} (Caching & Rate Limiting active)`);
    });

    redisClient.on('error', () => {
      // Suppress repetitive disconnect spam; in-memory fallback handles cache
      isRedisConnected = false;
    });

    redisClient.connect().catch(() => {
      isRedisConnected = false;
      console.log('💡 Redis server offline. Operating with high-performance in-memory cache.');
    });
  } catch (err) {
    isRedisConnected = false;
  }

  return redisClient;
};

/**
 * Get item from cache
 */
export const cacheGet = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (_) {
      return memoryCache.get(key);
    }
  }
  return memoryCache.get(key);
};

/**
 * Set item in cache with TTL (seconds)
 */
export const cacheSet = async (key, value, ttlSeconds = 300) => {
  const serialized = JSON.stringify(value);
  if (isRedisConnected && redisClient) {
    try {
      if (ttlSeconds) {
        await redisClient.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (_) {
      memoryCache.set(key, value, ttlSeconds);
      return true;
    }
  }
  memoryCache.set(key, value, ttlSeconds);
  return true;
};

/**
 * Delete key from cache
 */
export const cacheDel = async (key) => {
  memoryCache.del(key);
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
    } catch (_) {}
  }
};

/**
 * Delete keys matching pattern
 */
export const cacheDelPattern = async (pattern) => {
  memoryCache.delPattern(pattern);
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (_) {}
  }
};

export const getRedisStatus = () => ({
  connected: isRedisConnected,
  type: isRedisConnected ? 'Redis Distributed Cache' : 'In-Memory Cache Fallback',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
});

export const getRedisClient = () => (isRedisConnected ? redisClient : null);

export default {
  initRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  getRedisStatus,
  getRedisClient
};
