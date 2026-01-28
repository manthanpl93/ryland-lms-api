/**
 * Redis Client Wrapper
 * 
 * Provides a singleton Redis client that reads configuration from the Feathers app.
 * Automatically uses the correct database based on NODE_ENV:
 * - Production/Development: db: 0 (from config/default.json)
 * - Test: db: 1 (from config/test.json)
 */

import Redis, { Redis as RedisType } from "ioredis";
import { Application } from "../../declarations";

class RedisClient {
  private redis: RedisType | null = null;
  private static instance: RedisClient;
  private app: Application | null = null;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Get or create Redis client instance
   * @param app - Feathers application instance
   * @returns Redis client
   */
  getClient(app: Application): RedisType {
    if (!this.redis || this.redis.status === "end") {
      const redisConfig = app.get("redis");
      
      if (!redisConfig) {
        throw new Error("Redis configuration not found in app config");
      }

      this.redis = new Redis({
        host: redisConfig.host ?? "127.0.0.1",
        port: redisConfig.port ?? 6379,
        db: redisConfig.db ?? 0, // Use db from config, default to 0
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        enableOfflineQueue: true,
      });

      this.app = app;

      // Log connection events
      this.redis.on("connect", () => {
        console.log(`[Redis Client] Connected to Redis (db: ${redisConfig.db ?? 0})`);
      });

      this.redis.on("ready", () => {
        console.log(`[Redis Client] Redis ready (db: ${redisConfig.db ?? 0})`);
      });

      this.redis.on("error", (error) => {
        console.error("[Redis Client] Redis connection error:", error);
      });

      this.redis.on("close", () => {
        console.log("[Redis Client] Redis connection closed");
      });
    }

    return this.redis;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.app = null;
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.redis !== null && this.redis.status === "ready";
  }
}

export default RedisClient.getInstance();
