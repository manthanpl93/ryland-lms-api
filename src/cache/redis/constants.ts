/**
 * Redis Key Constants
 * 
 * Centralized management of all Redis key patterns used in the application.
 * This ensures consistency and makes it easy to update key patterns across the codebase.
 */

export const REDIS_KEYS = {
  /**
   * Class Leaderboard Keys
   * Format: class:leaderboard:{classId}
   * Type: Sorted Set (ZSET)
   * Score: Accumulated points
   * Member: Student user ID
   */
  CLASS_LEADERBOARD: 'class:leaderboard',
  
  /**
   * Helper function to generate leaderboard key for a specific class
   * @param classId - The class ID
   * @returns Redis key string
   */
  getClassLeaderboardKey: (classId: string): string => {
    return `${REDIS_KEYS.CLASS_LEADERBOARD}:${classId}`;
  },
} as const;
