import type { Request, Response } from 'express';
import { checkDatabaseHealth } from '../repositories/product.read.repository.js';
import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const dbHealthy = await checkDatabaseHealth();

  // Stage 1:
  // Redis is optional until we deploy ElastiCache in the caching chapter.
  const redisEnabled = Boolean(env.redisUrl);

  const redisHealthy = redisEnabled
  ? (redisClient?.isReady ?? false)
  : true;

  const healthy = dbHealthy && redisHealthy;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'Healthy' : 'Degraded',
    data: {
      status: healthy ? 'healthy' : 'degraded',
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisEnabled
        ? (redisHealthy ? 'connected' : 'disconnected')
        : 'disabled',
    },
  });
}