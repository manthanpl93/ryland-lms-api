import assert from "assert";
import app from "../../src/app";
import { setupTestRedis, flushTestRedisDb, teardownTestRedis } from "../utils/redis-test-helper";
import { Redis } from "ioredis";
import { LeaderboardService } from "../../src/cache/redis";
import createUsersModel from "../../src/models/users.model";
import createClassesModel from "../../src/models/classes.model";
import createCoursesModel from "../../src/models/courses.model";
import createClassEnrollmentsModel from "../../src/models/class-enrollments.model";

describe("Class Leaderboard Integration Tests", () => {
  let testRedisClient: Redis;
  let testSchoolId: any;
  let testClassId: any;
  let testCourseId: any;
  let testStudentIds: string[] = [];
  let testAdminId: any;

  before(async function() {
    this.timeout(10000);

    // Setup test Redis
    testRedisClient = await setupTestRedis();

    // Setup test database
    const schoolsModel = app.get("mongooseClient").models.schools;
    const usersModel = createUsersModel(app);
    const classesModel = createClassesModel(app);
    const coursesModel = createCoursesModel(app);

    // Create test school
    const school = await schoolsModel.create({
      schoolName: "Test Leaderboard School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active",
    });
    testSchoolId = school._id;

    // Create admin user
    const uniqueId = Date.now();
    const admin = await usersModel.create({
      firstName: "Test",
      lastName: "Admin",
      email: `admin_leaderboard_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}`,
      role: "Admin",
      status: "Active",
      schoolId: testSchoolId,
      password: "test123",
    });
    testAdminId = admin._id;

    // Create test class
    const classData = await classesModel.create({
      name: "Test Leaderboard Class",
      status: "Active",
      schoolId: testSchoolId,
      totalStudents: 0,
      totalCourses: 0,
    });
    testClassId = classData._id.toString();

    // Create test course
    const course = await coursesModel.create({
      title: "Test Leaderboard Course",
      classId: testClassId,
      status: "approved",
      learnings: ["Learning 1", "Learning 2"],
      outline: [],
      courseImage: {
        status: "finished",
        objectUrl: "https://test.com/image.jpg",
        fileName: "test.jpg",
        fileType: "image/jpeg",
        fileSize: 1000,
      },
    });
    testCourseId = course._id.toString();

    // Create test students
    for (let i = 0; i < 5; i++) {
      const student = await usersModel.create({
        firstName: `Student${i + 1}`,
        lastName: "Test",
        email: `student${i + 1}_leaderboard_${uniqueId}@test.com`,
        mobileNo: `+1${uniqueId}${i}`,
        role: "Student",
        status: "Active",
        schoolId: testSchoolId,
        password: "test123",
      });
      testStudentIds.push(student._id.toString());
    }

    // Enroll students in class
    const classEnrollmentsModel = createClassEnrollmentsModel(app);
    for (const studentId of testStudentIds) {
      await classEnrollmentsModel.create({
        classId: testClassId,
        studentId: studentId,
        status: "Active",
        enrolledBy: testAdminId,
      });
    }
  });

  afterEach(async () => {
    // Clean Redis between tests
    await flushTestRedisDb(testRedisClient);
  });

  after(async () => {
    await teardownTestRedis(testRedisClient);
  });

  describe("Basic Ranking", () => {
    it("should rank students correctly by points", async () => {
      const leaderboardService = new LeaderboardService(app);

      // Add students with different points
      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[1], 200);
      await leaderboardService.updateScore(testClassId, testStudentIds[2], 150);

      const topStudents = await leaderboardService.getTopStudents(testClassId, 10);

      assert.strictEqual(topStudents.length, 3);
      assert.strictEqual(topStudents[0].studentId, testStudentIds[1]); // Highest: 200
      assert.strictEqual(topStudents[0].score, 200);
      assert.strictEqual(topStudents[1].studentId, testStudentIds[2]); // Second: 150
      assert.strictEqual(topStudents[1].score, 150);
      assert.strictEqual(topStudents[2].studentId, testStudentIds[0]); // Third: 100
      assert.strictEqual(topStudents[2].score, 100);
    });

    it("should return correct rank numbers (1-based)", async () => {
      const leaderboardService = new LeaderboardService(app);

      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[1], 200);

      const rank0 = await leaderboardService.getStudentRank(testClassId, testStudentIds[0]);
      const rank1 = await leaderboardService.getStudentRank(testClassId, testStudentIds[1]);

      // Redis returns 0-based ranks
      assert.strictEqual(rank1, 0); // Highest score = rank 0
      assert.strictEqual(rank0, 1); // Second = rank 1
    });
  });

  describe("Score Updates", () => {
    it("should increment score correctly", async () => {
      const leaderboardService = new LeaderboardService(app);

      // Initial score
      await leaderboardService.updateScore(testClassId, testStudentIds[0], 50);
      let score = await leaderboardService.getStudentScore(testClassId, testStudentIds[0]);
      assert.strictEqual(score, 50);

      // Increment
      await leaderboardService.updateScore(testClassId, testStudentIds[0], 25);
      score = await leaderboardService.getStudentScore(testClassId, testStudentIds[0]);
      assert.strictEqual(score, 75);

      // Increment again
      await leaderboardService.updateScore(testClassId, testStudentIds[0], 10);
      score = await leaderboardService.getStudentScore(testClassId, testStudentIds[0]);
      assert.strictEqual(score, 85);
    });

    it("should handle negative points (deductions)", async () => {
      const leaderboardService = new LeaderboardService(app);

      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[0], -20);

      const score = await leaderboardService.getStudentScore(testClassId, testStudentIds[0]);
      assert.strictEqual(score, 80);
    });
  });

  describe("Top N + Current User", () => {
    it("should return top N students", async () => {
      const leaderboardService = new LeaderboardService(app);

      // Add 20 students worth of data (we only have 5, so add multiple times)
      for (let i = 0; i < 5; i++) {
        await leaderboardService.updateScore(testClassId, testStudentIds[i], (i + 1) * 10);
      }

      const top3 = await leaderboardService.getTopStudents(testClassId, 3);
      assert.strictEqual(top3.length, 3);
      assert.strictEqual(top3[0].score, 50); // Highest
      assert.strictEqual(top3[2].score, 30); // Third
    });

    it("should return current user rank when not in top N", async () => {
      const leaderboardService = new LeaderboardService(app);

      // Set up scores
      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[1], 90);
      await leaderboardService.updateScore(testClassId, testStudentIds[2], 80);
      await leaderboardService.updateScore(testClassId, testStudentIds[3], 70);
      await leaderboardService.updateScore(testClassId, testStudentIds[4], 10); // Low score

      const top3 = await leaderboardService.getTopStudents(testClassId, 3);
      const userRank = await leaderboardService.getStudentRank(testClassId, testStudentIds[4]);
      const userScore = await leaderboardService.getStudentScore(testClassId, testStudentIds[4]);

      assert.strictEqual(top3.length, 3);
      assert.strictEqual(userRank, 4); // 0-based, so rank 4 = 5th place
      assert.strictEqual(userScore, 10);
    });
  });

  describe("Tie Handling", () => {
    it("should handle students with same points", async () => {
      const leaderboardService = new LeaderboardService(app);

      // Add students with same points
      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[1], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[2], 50);

      const topStudents = await leaderboardService.getTopStudents(testClassId, 10);

      // Both should have score 100
      assert.ok(
        topStudents[0].score === 100 && topStudents[1].score === 100
      );
      assert.strictEqual(topStudents[2].score, 50);
    });
  });

  describe("Empty Leaderboard", () => {
    it("should handle empty leaderboard gracefully", async () => {
      const leaderboardService = new LeaderboardService(app);

      const topStudents = await leaderboardService.getTopStudents(testClassId, 10);
      const totalStudents = await leaderboardService.getTotalStudents(testClassId);

      assert.strictEqual(topStudents.length, 0);
      assert.strictEqual(totalStudents, 0);
    });

    it("should return null for rank of non-existent student", async () => {
      const leaderboardService = new LeaderboardService(app);

      const rank = await leaderboardService.getStudentRank(testClassId, "nonexistent-id");
      const score = await leaderboardService.getStudentScore(testClassId, "nonexistent-id");

      assert.strictEqual(rank, null);
      assert.strictEqual(score, null);
    });
  });

  describe("API Integration", () => {
    it("should get leaderboard via API service", async () => {
      const leaderboardService = new LeaderboardService(app);

      // Add some scores
      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[1], 200);

      // Get via API
      const params = {
        user: {
          _id: testStudentIds[0],
          role: "Student",
          schoolId: testSchoolId,
        },
        query: { limit: 10 },
      };

      const result = await app.service("class-leaderboard").get(testClassId, params);

      assert.ok(result.classId === testClassId);
      assert.strictEqual(result.totalStudents, 2);
      assert.strictEqual(result.topStudents.length, 2);
      assert.strictEqual(result.topStudents[0].points, 200);
      assert.strictEqual(result.topStudents[1].points, 100);
      assert.ok(result.currentUser !== null);
      assert.strictEqual(result.currentUser.studentId, testStudentIds[0]);
    });
  });

  describe("Total Students Count", () => {
    it("should return correct total students count", async () => {
      const leaderboardService = new LeaderboardService(app);

      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[1], 200);
      await leaderboardService.updateScore(testClassId, testStudentIds[2], 150);

      const total = await leaderboardService.getTotalStudents(testClassId);
      assert.strictEqual(total, 3);
    });
  });

  describe("Clear Leaderboard", () => {
    it("should clear leaderboard for a class", async () => {
      const leaderboardService = new LeaderboardService(app);

      await leaderboardService.updateScore(testClassId, testStudentIds[0], 100);
      await leaderboardService.updateScore(testClassId, testStudentIds[1], 200);

      let total = await leaderboardService.getTotalStudents(testClassId);
      assert.strictEqual(total, 2);

      await leaderboardService.clearClassLeaderboard(testClassId);

      total = await leaderboardService.getTotalStudents(testClassId);
      assert.strictEqual(total, 0);
    });
  });
});
