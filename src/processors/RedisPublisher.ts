import Redis from "ioredis";
import feathers from "@feathersjs/feathers";
import configuration from "@feathersjs/configuration";
const appConfig = feathers().configure(configuration());
const RedisAuth = appConfig.get("redis");

class RedisPublisher {
  redis: any;
  private static _instance: RedisPublisher;
  constructor() {
    if (RedisPublisher._instance instanceof RedisPublisher) {
      if (RedisPublisher._instance.redis.status !== "end") {
        RedisPublisher._instance.redis.connect();
      }
      return RedisPublisher._instance;
    }

    // enableReadyCheck and enableOfflineQueue are enabled by default
    this.redis = new Redis({
      port: RedisAuth?.port ?? 6379,
      host: RedisAuth?.host ?? "127.0.0.1",
      maxRetriesPerRequest: null,
    });

    RedisPublisher._instance = this;
  }

  getInstance() {
    if (this.redis.status === "end") {
      // This is a promise but the commands should queue till connected to server
      this.redis.connect();
    }
    return this.redis;
  }
}

export default new RedisPublisher();
