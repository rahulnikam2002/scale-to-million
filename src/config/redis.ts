import { createClient, type RedisClientType } from 'redis';
import { env } from './env.js';
import { logger } from './logger.js';

export let redisClient: RedisClientType | null = null;

export async function connectRedis(): Promise<void> {
  if (!env.redisUrl) {
    logger.info('Redis disabled (no REDIS_URL set)');
    return;
  }

  redisClient = createClient({
    url: env.redisUrl,
  });

  redisClient.on('error', (err: Error) => {
    logger.error({ err }, 'Redis client error');
  });

  try {
    await redisClient.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.error({ err }, 'Redis unavailable, continuing without cache');

    // Keep the application running without Redis.
    redisClient = null;
  }
}