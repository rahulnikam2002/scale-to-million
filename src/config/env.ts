import dotenv from 'dotenv';

dotenv.config();

function getRequired(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getOptional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: parseInt(getOptional('PORT', '5000'), 10),
  nodeEnv: getOptional('NODE_ENV', 'development'),

  pgHost: getOptional('PG_HOST', 'localhost'),
  pgPort: parseInt(getOptional('PG_PORT', '5432'), 10),
  pgDatabase: getOptional('PG_DATABASE', 'api_that_scale'),
  pgUser: getOptional('PG_USER', 'postgres'),
  pgPassword: getRequired('PG_PASSWORD'),

  // Read Replica
  pgReplicaHost:
    process.env.PG_REPLICA_HOST ??
    process.env.PG_HOST ??
    'localhost',

  pgReplicaPort: parseInt(
    process.env.PG_REPLICA_PORT ??
      process.env.PG_PORT ??
      '5432',
    10
  ),

  // Optional until Redis is deployed
  redisUrl: process.env.REDIS_URL,
} as const;