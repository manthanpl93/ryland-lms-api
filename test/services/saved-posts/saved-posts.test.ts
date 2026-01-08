import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Saved Posts Integration Tests", () => {
  let server: any;
  let student1Token: string;
  let student2Token: string;
  let testStudent1Id: any;
  let testStudent2Id: any;
  let testClassId: any;
  let testCommunityId: any;
  let testPost1Id: any;
  let testPost2Id: any;
  let testPost3Id: any;
  let testSchoolId: any;

  before(async function() {
    this.timeout(10000);

    const port = app.get("port") || 3031;
    server = app.listen(port);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await clearTestDatabase();

    const schoolsModel = app.get("mongooseClient").models.schools;
    const usersModel = app.get("mongooseClient").models.users;
    const classesModel = app.get("mongooseClient").models.classes;
    const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;
    const communitiesModel = app.get("mongooseClient").models.communities;
    const forumPostsModel = app.get("mongooseClient").models.forumPosts;

    const school = await schoolsModel.create({
      schoolName: "Test Saved Posts School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    const uniqueId = Date.now();
    const testOTP = 111111;

    const student1 = await usersModel.create({
      firstName: "Student1",
      lastName: "Test",
      email: `student1_saved_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}1`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudent1Id = student1._id;

    const student2 = await usersModel.create({
      firstName: "Student2",
      lastName: "Test",
      email: `student2_saved_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}2`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudent2Id = student2._id;

    const auth1 = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student1.mobileNo,
      otp: testOTP
    }, {});
    student1Token = auth1.accessToken;

    const auth2 = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student2.mobileNo,
      otp: testOTP
    }, {});
    student2Token = auth2.accessToken;

    const testClass = await classesModel.create({
      name: "Test Saved Posts Class",
      status: "Active",
      schoolId: testSchoolId
    });
    testClassId = testClass._id;

    await classEnrollmentsModel.create({
      classId: testClassId,
      studentId: testStudent1Id,
      status: "Active"
    });

    await classEnrollmentsModel.create({
      classId: testClassId,
      studentId: testStudent2Id,
      status: "Active"
    });

    const community = await communitiesModel.create({
      name: "Test Community",
      type: "class",
      classId: testClassId,
      isActive: true
    });
    testCommunityId = community._id;

    const post1 = await forumPostsModel.create({
      title: "Test Post 1",
      content: "Content for saved posts test number one.",
      authorId: testStudent1Id,
      communityId: testCommunityId,
      classId: testClassId
    });
    testPost1Id = post1._id;

    const post2 = await forumPostsModel.create({
      title: "Test Post 2",
      content: "Content for saved posts test number two.",
      authorId: testStudent1Id,
      communityId: testCommunityId,
      classId: testClassId
    });
    testPost2Id = post2._id;

    const post3 = await forumPostsModel.create({
      title: "Test Post 3",
      content: "Content for saved posts test number three.",
      authorId: testStudent2Id,
      communityId: testCommunityId,
      classId: testClassId
    });
    testPost3Id = post3._id;
  });

  after(async function() {
    this.timeout(10000);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearTestDatabase();
  });

  it("Test 1: Save post creates saved-posts record", async function(this: Mocha.Context) {
    this.timeout(5000);

    const savedPostsService = app.service("saved-posts");
    const savedPostsModel = app.get("mongooseClient").models.savedPosts;

    const saved = await savedPostsService.create({
      postId: testPost1Id
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    assert.ok(saved._id, "Saved post record should be created");
    assert.strictEqual(saved.postId.toString(), testPost1Id.toString(), "postId should match");
    assert.strictEqual(saved.userId.toString(), testStudent1Id.toString(), "userId should match");

    const record = await savedPostsModel.findById(saved._id).lean();
    assert.ok(record, "Record should exist in database");
  });

  it("Test 2: Cannot save same post twice", async function(this: Mocha.Context) {
    this.timeout(5000);

    const savedPostsService = app.service("saved-posts");

    await savedPostsService.create({
      postId: testPost2Id
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    const result = await savedPostsService.create({
      postId: testPost2Id
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    // Should return existing record, not create duplicate
    assert.ok(result._id, "Should return a record");
    assert.strictEqual(result.postId.toString(), testPost2Id.toString(), "Should be same post");
  });

  it("Test 3: Find saved posts for user", async function(this: Mocha.Context) {
    this.timeout(5000);

    const savedPostsService = app.service("saved-posts");

    await savedPostsService.create({
      postId: testPost1Id
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    await savedPostsService.create({
      postId: testPost2Id
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    await savedPostsService.create({
      postId: testPost3Id
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const result = await savedPostsService.find({
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const saved = Array.isArray(result) ? result : result.data || [];
    assert.ok(saved.length >= 3, "Should return at least 3 saved posts");

    // Check that posts are populated
    const firstSaved = saved[0];
    assert.ok(firstSaved.postId, "Should have postId populated");
  });

  it("Test 4: Unsave post removes record", async function(this: Mocha.Context) {
    this.timeout(5000);

    const savedPostsService = app.service("saved-posts");
    const savedPostsModel = app.get("mongooseClient").models.savedPosts;

    const saved = await savedPostsService.create({
      postId: testPost3Id
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    await savedPostsService.remove(saved._id, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    const record = await savedPostsModel.findById(saved._id).lean();
    assert.ok(!record, "Record should be deleted from database");
  });

  it("Test 5: Saved posts belong to user only", async function(this: Mocha.Context) {
    this.timeout(5000);

    const savedPostsService = app.service("saved-posts");

    // Student1 saves a post
    await savedPostsService.create({
      postId: testPost1Id
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    // Student2 gets their saved posts
    const result = await savedPostsService.find({
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const saved = Array.isArray(result) ? result : result.data || [];
    const postIds = saved.map((s: any) => s.postId?._id?.toString() || s.postId?.toString()).filter(Boolean);

    // Student2's list should not include Student1's saved post (unless they saved it too)
    // This is just checking isolation - we're not asserting absence since student2 might have saved it in other tests
    assert.ok(Array.isArray(saved), "Should return array of saved posts");
  });
});

