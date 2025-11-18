import Redis from "ioredis";
import { aiQuizQueue } from "../processors/ai-quiz-processor";
import { AI_QUIZ_LIMITS, AI_QUIZ_STATUS } from "./consts/ai-quiz-constants";
import createAIQuizSessionsModel from "../models/ai-quiz-sessions.model";

export class QueueManager {
  private redis!: Redis;
  private aiQuizSessionsModel: any;

  constructor(app: any) {
    console.log("[Queue Manager] Initializing QueueManager...");
    const redisConfig = app.get("redis");
    console.log("[Queue Manager] Redis config:", JSON.stringify(redisConfig, null, 2));
    
    this.redis = new Redis({
      port: redisConfig?.port ?? 6379,
      host: redisConfig?.host ?? "127.0.0.1",
      maxRetriesPerRequest: null,
      connectTimeout: 5000, // 5 second timeout
      lazyConnect: true, // Don't connect immediately
    });
    
    // Add connection event listeners
    this.redis.on("connect", () => {
      console.log("[Queue Manager] Redis connected successfully");
    });
    
    this.redis.on("error", (error) => {
      console.error("[Queue Manager] Redis connection error:", error);
    });
    
    this.redis.on("ready", () => {
      console.log("[Queue Manager] Redis ready");
    });
    
    this.redis.on("close", () => {
      console.log("[Queue Manager] Redis connection closed");
    });
    
    this.aiQuizSessionsModel = createAIQuizSessionsModel(app);
    console.log("[Queue Manager] QueueManager initialized");
  }

  // Check if user can process new request (rate limiting)
  async canProcessRequest(userId: string): Promise<boolean> {
    console.log("[Queue Manager] canProcessRequest called for user:", userId);
    try {
      // Check user rate limits
      console.log("[Queue Manager] Checking user rate limits...");
      const userRequestKey = `ai-quiz-rate-limit:${userId}`;
      
      // Add timeout to Redis operation
      const userRequests = await Promise.race([
        this.redis.get(userRequestKey),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error("Redis timeout")), 5000)
        )
      ]);
      console.log("[Queue Manager] User requests count:", userRequests);

      if (
        userRequests &&
        parseInt(userRequests) >= AI_QUIZ_LIMITS.RATE_LIMIT_PER_USER
      ) {
        console.log("[Queue Manager] Rate limit exceeded for user:", userId);
        return false;
      }

      // Check queue capacity - simplified to avoid timeouts
      console.log("[Queue Manager] Checking queue capacity...");
      try {
        const queueStats = await Promise.race([
          this.getQueueStatus(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error("Queue status timeout")), 5000)
          )
        ]);
        console.log("[Queue Manager] Queue stats:", JSON.stringify(queueStats, null, 2));
        if (queueStats.waiting >= AI_QUIZ_LIMITS.MAX_QUEUE_SIZE) {
          console.log("[Queue Manager] Queue is full");
          return false;
        }
      } catch (error) {
        console.log("[Queue Manager] Queue status check failed, allowing request:", error);
        // If queue status check fails, allow the request to proceed
        // This prevents blocking due to Redis/queue issues
      }

      // Check if user has active sessions
      console.log("[Queue Manager] Checking active sessions for user:", userId);
      const activeSessions = await Promise.race([
        this.aiQuizSessionsModel.countDocuments({
          userId,
          status: { $in: [AI_QUIZ_STATUS.PENDING, AI_QUIZ_STATUS.PROCESSING] },
        }),
        new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error("Database timeout")), 5000)
        )
      ]);
      console.log("[Queue Manager] Active sessions count:", activeSessions);

      if (activeSessions >= 2) {
        // Max 2 active sessions per user
        console.log("[Queue Manager] User has maximum active sessions");
        return false;
      }

      console.log("[Queue Manager] User can process request");
      return true;
    } catch (error) {
      console.error("[Queue Manager] Error checking request permissions:", error);
      return false;
    }
  }

  // Increment user request count
  async incrementUserRequestCount(userId: string): Promise<void> {
    try {
      const userRequestKey = `ai-quiz-rate-limit:${userId}`;
      const pipeline = this.redis.pipeline();

      pipeline.incr(userRequestKey);
      pipeline.expire(userRequestKey, AI_QUIZ_LIMITS.RATE_LIMIT_WINDOW / 1000); // Convert to seconds

      await pipeline.exec();
    } catch (error) {
      console.error("Error incrementing user request count:", error);
    }
  }

  // Get retry after time for rate limited user
  async getRetryAfter(userId: string): Promise<number> {
    try {
      const userRequestKey = `ai-quiz-rate-limit:${userId}`;
      const ttl = await this.redis.ttl(userRequestKey);
      return Math.max(0, ttl);
    } catch (error) {
      console.error("Error getting retry after time:", error);
      return 3600; // Default 1 hour
    }
  }

  // Get user's rate limit info
  async getRateLimitInfo(userId: string): Promise<any> {
    try {
      const userRequestKey = `ai-quiz-rate-limit:${userId}`;
      const [requests, ttl] = await Promise.all([
        this.redis.get(userRequestKey),
        this.redis.ttl(userRequestKey),
      ]);

      return {
        requestsUsed: parseInt(requests || "0"),
        requestsLimit: AI_QUIZ_LIMITS.RATE_LIMIT_PER_USER,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
        canMakeRequest:
          parseInt(requests || "0") < AI_QUIZ_LIMITS.RATE_LIMIT_PER_USER,
      };
    } catch (error) {
      console.error("Error getting rate limit info:", error);
      return {
        requestsUsed: 0,
        requestsLimit: AI_QUIZ_LIMITS.RATE_LIMIT_PER_USER,
        resetTime: null,
        canMakeRequest: true,
      };
    }
  }

  // Get queue position for a job
  async getQueuePosition(sessionId: string): Promise<number> {
    try {
      const waitingJobs = await aiQuizQueue.getWaiting();
      const jobIndex = waitingJobs.findIndex(
        (job) => job.data.sessionId === sessionId
      );
      return jobIndex >= 0 ? jobIndex + 1 : 0;
    } catch (error) {
      console.error("Error getting queue position:", error);
      return 0;
    }
  }

  // Get overall queue status
  async getQueueStatus(): Promise<any> {
    console.log("[Queue Manager] getQueueStatus called");
    try {
      console.log("[Queue Manager] Getting queue statistics...");
      
      // Add individual timeouts for each queue operation
      const queueOperations = [
        aiQuizQueue.getWaiting(),
        aiQuizQueue.getActive(),
        aiQuizQueue.getCompleted(),
        aiQuizQueue.getFailed(),
        aiQuizQueue.getDelayed(),
      ];
      
      const [waiting, active, completed, failed, delayed] = await Promise.allSettled(queueOperations);
      
      // Handle any rejected promises
      const waitingJobs = waiting.status === "fulfilled" ? waiting.value : [];
      const activeJobs = active.status === "fulfilled" ? active.value : [];
      const completedJobs = completed.status === "fulfilled" ? completed.value : [];
      const failedJobs = failed.status === "fulfilled" ? failed.value : [];
      const delayedJobs = delayed.status === "fulfilled" ? delayed.value : [];
      
      console.log("[Queue Manager] Queue statistics retrieved:", {
        waiting: waitingJobs.length,
        active: activeJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
        delayed: delayedJobs.length
      });

      // Get processing statistics with timeout
      console.log("[Queue Manager] Getting processing statistics...");
      const processingStats = await Promise.race([
        this.getProcessingStats(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("Processing stats timeout")), 5000)
        )
      ]);
      console.log("[Queue Manager] Processing stats retrieved");

      const result = {
        waiting: waitingJobs.length,
        active: activeJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
        delayed: delayedJobs.length,
        maxQueueSize: AI_QUIZ_LIMITS.MAX_QUEUE_SIZE,
        maxConcurrentJobs: AI_QUIZ_LIMITS.MAX_CONCURRENT_JOBS,
        isQueueFull: waitingJobs.length >= AI_QUIZ_LIMITS.MAX_QUEUE_SIZE,
        estimatedWaitTime: waitingJobs.length * 120, // 2 minutes per job
        processingStats,
      };
      console.log("[Queue Manager] Queue status result:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error("[Queue Manager] Error getting queue status:", error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        maxQueueSize: AI_QUIZ_LIMITS.MAX_QUEUE_SIZE,
        maxConcurrentJobs: AI_QUIZ_LIMITS.MAX_CONCURRENT_JOBS,
        isQueueFull: false,
        estimatedWaitTime: 0,
        processingStats: {},
      };
    }
  }

  // Get processing statistics
  private async getProcessingStats(): Promise<any> {
    console.log("[Queue Manager] getProcessingStats called");
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      console.log("[Queue Manager] Running daily stats aggregation...");
      const [dailyStats, hourlyStats] = await Promise.all([
        this.aiQuizSessionsModel.aggregate([
          {
            $match: {
              createdAt: { $gte: oneDayAgo },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              avgProcessingTime: {
                $avg: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$startedAt", null] },
                        { $ne: ["$completedAt", null] },
                      ],
                    },
                    { $subtract: ["$completedAt", "$startedAt"] },
                    null,
                  ],
                },
              },
            },
          },
        ]),
        this.aiQuizSessionsModel.aggregate([
          {
            $match: {
              createdAt: { $gte: oneHourAgo },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);
      console.log("[Queue Manager] Aggregation queries completed");

      const result = {
        last24Hours: dailyStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = {
            count: stat.count,
            avgProcessingTime: stat.avgProcessingTime
              ? Math.round(stat.avgProcessingTime / 1000)
              : null, // Convert to seconds
          };
          return acc;
        }, {}),
        lastHour: hourlyStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
      };
      console.log("[Queue Manager] Processing stats result:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error("[Queue Manager] Error getting processing stats:", error);
      return {};
    }
  }

  // Cancel a job
  async cancelJob(sessionId: string): Promise<boolean> {
    try {
      // Find job in waiting queue
      const waitingJobs = await aiQuizQueue.getWaiting();
      const job = waitingJobs.find((j) => j.data.sessionId === sessionId);

      if (job) {
        await job.remove();
        console.log(
          `[Queue Manager] Cancelled waiting job for session ${sessionId}`
        );
        return true;
      }

      // Check if job is active (harder to cancel)
      const activeJobs = await aiQuizQueue.getActive();
      const activeJob = activeJobs.find((j) => j.data.sessionId === sessionId);

      if (activeJob) {
        // Mark for cancellation - the worker should check this
        await this.redis.set(`ai-quiz-cancel:${sessionId}`, "1", "EX", 300); // 5 minutes expiry
        console.log(
          `[Queue Manager] Marked active job for cancellation: ${sessionId}`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error cancelling job:", error);
      return false;
    }
  }

  // Check if job is marked for cancellation
  async isJobCancelled(sessionId: string): Promise<boolean> {
    try {
      const cancelled = await this.redis.get(`ai-quiz-cancel:${sessionId}`);
      return cancelled === "1";
    } catch (error) {
      console.error("Error checking job cancellation:", error);
      return false;
    }
  }

  // Clear cancellation flag
  async clearCancellationFlag(sessionId: string): Promise<void> {
    try {
      await this.redis.del(`ai-quiz-cancel:${sessionId}`);
    } catch (error) {
      console.error("Error clearing cancellation flag:", error);
    }
  }

  // Clean up old completed/failed jobs
  async cleanupOldJobs(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Clean up old sessions
      await this.aiQuizSessionsModel.deleteMany({
        status: {
          $in: [
            AI_QUIZ_STATUS.COMPLETED,
            AI_QUIZ_STATUS.FAILED,
            AI_QUIZ_STATUS.CANCELLED,
          ],
        },
        updatedAt: { $lt: oneDayAgo },
      });

      // Clean up queue jobs
      await aiQuizQueue.clean(24 * 60 * 60 * 1000, 100, "completed");
      await aiQuizQueue.clean(24 * 60 * 60 * 1000, 100, "failed");

      console.log("[Queue Manager] Cleaned up old jobs and sessions");
    } catch (error) {
      console.error("Error cleaning up old jobs:", error);
    }
  }

  // Get queue health status
  async getQueueHealth(): Promise<any> {
    try {
      const queueStatus = await this.getQueueStatus();
      const redisStatus = this.redis.status;

      // Check if queue is healthy
      const isHealthy =
        redisStatus === "ready" &&
        queueStatus.active <= AI_QUIZ_LIMITS.MAX_CONCURRENT_JOBS &&
        queueStatus.waiting <= AI_QUIZ_LIMITS.MAX_QUEUE_SIZE;

      return {
        isHealthy,
        redis: {
          status: redisStatus,
          connected: redisStatus === "ready",
        },
        queue: queueStatus,
        issues: [],
      };
    } catch (error) {
      console.error("Error getting queue health:", error);
      return {
        isHealthy: false,
        redis: { status: "error", connected: false },
        queue: {},
        issues: ["Failed to get queue health status"],
      };
    }
  }
}

let queueManagerInstance: QueueManager | null = null;
export function getQueueManager(app: any) {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager(app);
  }
  return queueManagerInstance;
}
