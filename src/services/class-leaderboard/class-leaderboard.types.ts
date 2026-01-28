/**
 * Class Leaderboard Types
 */

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  points: number;
}

export interface ClassLeaderboardResponse {
  classId: string;
  totalStudents: number;
  topStudents: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}
