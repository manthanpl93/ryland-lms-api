import Redis from "ioredis";
import feathers from "@feathersjs/feathers";
import configuration from "@feathersjs/configuration";
const appConfig = feathers().configure(configuration());
const RedisAuth = appConfig.get("redis");

class RedisSubscriber {
  redis: any;
  private static _instance: RedisSubscriber;
  constructor() {
    if (RedisSubscriber._instance instanceof RedisSubscriber) {
      if (RedisSubscriber._instance.redis.status !== "end") {
        RedisSubscriber._instance.redis.connect();
      }
      return RedisSubscriber._instance;
    }

    // enableReadyCheck and enableOfflineQueue are enabled by default
    this.redis = new Redis({
      port: RedisAuth?.port ?? 6379,
      host: RedisAuth?.host ?? "127.0.0.1",
      maxRetriesPerRequest: null,
    });

    RedisSubscriber._instance = this;
  }

  getInstance() {
    if (this.redis.status === "end") {
      // This is a promise but the commands should queue till connected to server
      this.redis.connect();
    }
    return this.redis;
  }
}

export default new RedisSubscriber();
