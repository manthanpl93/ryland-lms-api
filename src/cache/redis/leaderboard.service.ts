/**
 * Leaderboard Redis Service
 * 
 * Handles all Redis operations for class leaderboards using Sorted Sets.
 * Provides methods to update scores, get rankings, and manage leaderboard data.
 */

import { Application } from "../../declarations";
import redisClient from "./client";
import { REDIS_KEYS } from "./constants";
import { Redis } from "ioredis";

export class LeaderboardService {
  private app: Application;
  private redis: Redis;

  constructor(app: Application) {
    this.app = app;
    this.redis = redisClient.getClient(app);
  }

  /**
   * Update student score in class leaderboard
   * Uses ZINCRBY to increment score atomically
   * 
   * @param classId - The class ID
   * @param studentId - The student user ID
   * @param points - Points to add (can be negative)
   * @returns New total score after increment
   */
  async updateScore(
    classId: string,
    studentId: string,
    points: number
  ): Promise<number> {
    try {
      const key = REDIS_KEYS.getClassLeaderboardKey(classId);
      const newScore = await this.redis.zincrby(key, points, studentId);
      return parseFloat(newScore);
    } catch (error) {
      console.error(
        `[LeaderboardService] Error updating score for class ${classId}, student ${studentId}:`,
        error
      );
      // Graceful degradation - log error but don't throw
      // This allows the system to continue even if Redis is unavailable
      throw error;
    }
  }

  /**
   * Get top N students from leaderboard
   * Uses ZREVRANGE to get highest scores first
   * 
   * @param classId - The class ID
   * @param limit - Number of top students to return (default: 10)
   * @returns Array of { studentId, score } sorted by score descending
   */
  async getTopStudents(
    classId: string,
    limit: number = 10
  ): Promise<Array<{ studentId: string; score: number }>> {
    try {
      const key = REDIS_KEYS.getClassLeaderboardKey(classId);
      const results = await this.redis.zrevrange(key, 0, limit - 1, "WITHSCORES");
      
      const students: Array<{ studentId: string; score: number }> = [];
      for (let i = 0; i < results.length; i += 2) {
        students.push({
          studentId: results[i],
          score: parseFloat(results[i + 1]),
        });
      }
      
      return students;
    } catch (error) {
      console.error(
        `[LeaderboardService] Error getting top students for class ${classId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get student's rank in class leaderboard
   * Uses ZREVRANK to get rank (0-based, highest score = rank 0)
   * 
   * @param classId - The class ID
   * @param studentId - The student user ID
   * @returns Rank (0-based) or null if student not found
   */
  async getStudentRank(
    classId: string,
    studentId: string
  ): Promise<number | null> {
    try {
      const key = REDIS_KEYS.getClassLeaderboardKey(classId);
      const rank = await this.redis.zrevrank(key, studentId);
      return rank !== null ? rank : null;
    } catch (error) {
      console.error(
        `[LeaderboardService] Error getting rank for class ${classId}, student ${studentId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get student's score in class leaderboard
   * Uses ZSCORE to get current score
   * 
   * @param classId - The class ID
   * @param studentId - The student user ID
   * @returns Score or null if student not found
   */
  async getStudentScore(
    classId: string,
    studentId: string
  ): Promise<number | null> {
    try {
      const key = REDIS_KEYS.getClassLeaderboardKey(classId);
      const score = await this.redis.zscore(key, studentId);
      return score !== null ? parseFloat(score) : null;
    } catch (error) {
      console.error(
        `[LeaderboardService] Error getting score for class ${classId}, student ${studentId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get total number of students in leaderboard
   * Uses ZCARD to count members
   * 
   * @param classId - The class ID
   * @returns Total number of students
   */
  async getTotalStudents(classId: string): Promise<number> {
    try {
      const key = REDIS_KEYS.getClassLeaderboardKey(classId);
      return await this.redis.zcard(key);
    } catch (error) {
      console.error(
        `[LeaderboardService] Error getting total students for class ${classId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clear leaderboard for a class
   * Uses DEL to remove the entire sorted set
   * 
   * @param classId - The class ID
   */
  async clearClassLeaderboard(classId: string): Promise<void> {
    try {
      const key = REDIS_KEYS.getClassLeaderboardKey(classId);
      await this.redis.del(key);
    } catch (error) {
      console.error(
        `[LeaderboardService] Error clearing leaderboard for class ${classId}:`,
        error
      );
      throw error;
    }
  }
}
