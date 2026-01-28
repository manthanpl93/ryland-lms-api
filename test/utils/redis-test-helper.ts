/**
 * Redis Test Helper Utilities
 * 
 * Helper functions for setting up and managing Redis connections in tests.
 * Uses configuration from config/test.json automatically.
 */

import Redis, { Redis as RedisType } from "ioredis";
import app from "../../src/app";

/**
 * Setup test Redis connection
 * Uses Redis database 1 from config/test.json
 */
export async function setupTestRedis(): Promise<RedisType> {
  const redisConfig = app.get("redis");
  const redis = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db, // Will be 1 from config/test.json
    maxRetriesPerRequest: null,
  });

  // Wait for connection
  await redis.ping();

  return redis;
}

/**
 * Flush test Redis database
 * Only flushes the current database (db: 1 for tests)
 */
export async function flushTestRedisDb(redis: RedisType): Promise<void> {
  await redis.flushdb();
}

/**
 * Teardown test Redis connection
 */
export async function teardownTestRedis(redis: RedisType): Promise<void> {
  await redis.quit();
}
