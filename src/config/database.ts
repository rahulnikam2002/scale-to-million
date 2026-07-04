import { Pool } from 'pg';
import { env } from './env.js';

const poolConfig = {
  database: env.pgDatabase,
  user: env.pgUser,
  password: env.pgPassword,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl:
    env.nodeEnv === 'production'
      ? { rejectUnauthorized: false }
      : false,
};

// All write operations target the primary database.
export const primaryPool = new Pool({
  ...poolConfig,
  host: env.pgHost,
  port: env.pgPort,
});

// All read operations target the replica.
// When PG_REPLICA_HOST is not configured, this points to primary (safe default).
// To enable read replicas: set PG_REPLICA_HOST in your environment.
export const replicaPool = new Pool({
  ...poolConfig,
  host: env.pgReplicaHost,
  port: env.pgReplicaPort,
});