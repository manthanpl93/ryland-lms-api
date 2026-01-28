/**
 * Class Leaderboard Service
 * 
 * Provides leaderboard data for classes using Redis Sorted Sets.
 * Returns top N students plus current user's rank.
 */

import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params, Id } from "@feathersjs/feathers";
import { BadRequest, Forbidden, NotFound } from "@feathersjs/errors";
import { LeaderboardService } from "../../cache/redis";
import { ClassLeaderboardResponse, LeaderboardEntry } from "./class-leaderboard.types";
import createUsersModel from "../../models/users.model";
import createClassesModel from "../../models/classes.model";
import createClassEnrollmentsModel from "../../models/class-enrollments.model";
import createClassTeachersModel from "../../models/class-teachers.model";

export class ClassLeaderboard extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  /**
   * Get class leaderboard with top N students and current user's rank
   * 
   * @param id - Class ID
   * @param params - Service parameters including user and query
   * @returns Leaderboard data
   */
  async get(id: Id, params?: Params): Promise<ClassLeaderboardResponse> {
    const classId = id.toString();
    const userId = params?.user?._id?.toString();
    const userRole = params?.user?.role;
    const limit = parseInt(params?.query?.limit as string) || 10;

    if (!userId) {
      throw new Forbidden("Authentication required");
    }

    // Verify class exists
    const classesModel = createClassesModel(this.app);
    const classData = await classesModel.findById(classId).lean();
    if (!classData || classData.isDeleted) {
      throw new NotFound("Class not found");
    }

    // Check authorization based on role
    await this.checkAuthorization(classId, userId, userRole);

    // Get leaderboard data from Redis
    const leaderboardService = new LeaderboardService(this.app);
    
    // Get top students
    const topStudentsData = await leaderboardService.getTopStudents(classId, limit);
    
    // Get total students count
    const totalStudents = await leaderboardService.getTotalStudents(classId);

    // Enrich top students with user names
    const topStudents = await this.enrichWithStudentNames(topStudentsData);

    // Get current user's rank and score
    let currentUser: LeaderboardEntry | null = null;
    if (userRole === "Student") {
      const userRank = await leaderboardService.getStudentRank(classId, userId);
      const userScore = await leaderboardService.getStudentScore(classId, userId);

      if (userRank !== null && userScore !== null) {
        const user = await this.getStudentName(userId);
        currentUser = {
          rank: userRank + 1, // Convert 0-based to 1-based
          studentId: userId,
          studentName: user,
          points: userScore,
        };

        // If current user is not in top N, add them to the response
        const isInTopN = topStudents.some((s) => s.studentId === userId);
        if (!isInTopN && currentUser) {
          // User is already included in currentUser, no need to add to topStudents
        }
      }
    }

    return {
      classId,
      totalStudents,
      topStudents,
      currentUser,
    };
  }

  /**
   * Check if user has permission to view leaderboard
   */
  private async checkAuthorization(
    classId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    switch (userRole) {
      case "Admin":
        // Admin can view all class leaderboards
        // Verify admin's school matches class's school
        const classesModel = createClassesModel(this.app);
        const usersModel = createUsersModel(this.app);
        const classData = await classesModel.findById(classId).select("schoolId").lean();
        const user = await usersModel.findById(userId).select("schoolId").lean();
        
        if (!classData || !user?.schoolId) {
          throw new Forbidden("Access denied");
        }
        
        if (classData.schoolId?.toString() !== user.schoolId.toString()) {
          throw new Forbidden("You can only view leaderboards for classes in your school");
        }
        break;

      case "Teacher":
        // Teacher can view leaderboards for classes they're assigned to
        const classTeachersModel = createClassTeachersModel(this.app);
        const assignment = await classTeachersModel
          .findOne({
            classId: classId,
            teacherId: userId,
            isActive: true,
          })
          .lean();

        if (!assignment) {
          throw new Forbidden(
            "Access denied. You are not assigned to this class."
          );
        }
        break;

      case "Student":
        // Student can only view leaderboard for their enrolled class
        const classEnrollmentsModel = createClassEnrollmentsModel(this.app);
        const enrollment = await classEnrollmentsModel
          .findOne({
            classId: classId,
            studentId: userId,
            status: "Active",
          })
          .lean();

        if (!enrollment) {
          throw new Forbidden(
            "Access denied. You are not enrolled in this class."
          );
        }
        break;

      default:
        throw new Forbidden("Invalid user role");
    }
  }

  /**
   * Enrich leaderboard entries with student names
   */
  private async enrichWithStudentNames(
    studentsData: Array<{ studentId: string; score: number }>
  ): Promise<LeaderboardEntry[]> {
    const usersModel = createUsersModel(this.app);
    const enriched: LeaderboardEntry[] = [];

    for (let i = 0; i < studentsData.length; i++) {
      const { studentId, score } = studentsData[i];
      const studentName = await this.getStudentName(studentId);
      
      enriched.push({
        rank: i + 1, // 1-based ranking
        studentId,
        studentName,
        points: score,
      });
    }

    return enriched;
  }

  /**
   * Get student name from user ID
   */
  private async getStudentName(userId: string): Promise<string> {
    try {
      const usersModel = createUsersModel(this.app);
      const user = await usersModel.findById(userId).select("firstName lastName").lean();
      
      if (!user) {
        return "Unknown Student";
      }

      const firstName = (user as any).firstName || "";
      const lastName = (user as any).lastName || "";
      return `${firstName} ${lastName}`.trim() || "Unknown Student";
    } catch (error) {
      console.error(`[ClassLeaderboard] Error getting student name for ${userId}:`, error);
      return "Unknown Student";
    }
  }
}
