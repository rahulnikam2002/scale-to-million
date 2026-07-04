import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { primaryPool } from './config/database.js';
import { connectRedis } from './config/redis.js';
import app from './app.js';

async function start(): Promise<void> {
  await connectRedis();

  const client = await primaryPool.connect();
  client.release();
  logger.info('PostgreSQL connected');

  app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, 'Server started');
  });
}

start().catch((err: Error) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
