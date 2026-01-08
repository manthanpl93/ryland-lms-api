import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Forum Tags Integration Tests", () => {
  let server: any;
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let testSchoolId: any;
  let testAdminId: any;
  let testTeacherId: any;
  let testStudentId: any;
  let testClassId: any;
  let testCommunityId: any;

  before(async function() {
    this.timeout(10000);

    const port = app.get("port") || 3031;
    server = app.listen(port);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await clearTestDatabase();

    const schoolsModel = app.get("mongooseClient").models.schools;
    const usersModel = app.get("mongooseClient").models.users;
    const classesModel = app.get("mongooseClient").models.classes;
    const classTeachersModel = app.get("mongooseClient").models.classTeachers;
    const communitiesModel = app.get("mongooseClient").models.communities;

    // Create test school
    const school = await schoolsModel.create({
      schoolName: "Test Forum Tags School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    // Create users
    const uniqueId = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const testOTP = 111111;

    const admin = await usersModel.create({
      firstName: "Test",
      lastName: "Admin",
      email: `admin_tags_${uniqueId}_${randomStr}@test.com`,
      mobileNo: `+1${uniqueId}${Math.random().toString().substr(2, 6)}`,
      role: "Admin",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testAdminId = admin._id;

    const teacher = await usersModel.create({
      firstName: "Test",
      lastName: "Teacher",
      email: `teacher_tags_${uniqueId}_${randomStr}@test.com`,
      mobileNo: `+1${uniqueId}${Math.random().toString().substr(2, 7)}`,
      role: "Teacher",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testTeacherId = teacher._id;

    const student = await usersModel.create({
      firstName: "Test",
      lastName: "Student",
      email: `student_tags_${uniqueId}_${randomStr}@test.com`,
      mobileNo: `+1${uniqueId}${Math.random().toString().substr(2, 8)}`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudentId = student._id;

    // Get tokens
    const adminAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: admin.mobileNo,
      otp: testOTP
    }, {});
    adminToken = adminAuth.accessToken;

    const teacherAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: teacher.mobileNo,
      otp: testOTP
    }, {});
    teacherToken = teacherAuth.accessToken;

    const studentAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student.mobileNo,
      otp: testOTP
    }, {});
    studentToken = studentAuth.accessToken;

    // Create class and community
    const testClass = await classesModel.create({
      name: "Test Tags Class",
      status: "Active",
      schoolId: testSchoolId
    });
    testClassId = testClass._id;

    await classTeachersModel.create({
      classId: testClassId,
      teacherId: testTeacherId,
      isActive: true
    });

    const community = await communitiesModel.create({
      name: "Test Community",
      type: "class",
      classId: testClassId,
      isActive: true
    });
    testCommunityId = community._id;
  });

  after(async function() {
    this.timeout(10000);
    
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await clearTestDatabase();
  });

  it("Test 1: Admin can create tag for community", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");
    const forumTagsModel = app.get("mongooseClient").models.forumTags;

    const tagData = await tagsService.create({
      name: "Homework",
      communityId: testCommunityId,
      color: "#FF5733"
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    assert.ok(tagData._id, "Tag should be created");
    assert.strictEqual(tagData.name, "homework", "Tag name should be lowercase");
    assert.strictEqual(tagData.color, "#FF5733", "Color should match");
    assert.strictEqual(tagData.usageCount, 0, "Initial usageCount should be 0");
    assert.strictEqual(tagData.isActive, true, "Tag should be active");

    // Verify in database
    const tag = await forumTagsModel.findById(tagData._id).lean();
    assert.ok(tag, "Tag should exist in database");
    assert.strictEqual(tag.createdBy.toString(), testAdminId.toString(), "createdBy should be admin");
  });

  it("Test 2: Teacher can create tag for their assigned class", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");

    const tagData = await tagsService.create({
      name: "Assignment",
      communityId: testCommunityId,
      color: "#3B82F6"
    }, {
      user: { _id: testTeacherId, role: "Teacher", schoolId: testSchoolId },
      authenticated: true
    });

    assert.ok(tagData._id, "Tag should be created");
    assert.strictEqual(tagData.name, "assignment", "Tag name should be lowercase");
    assert.strictEqual(tagData.createdBy.toString(), testTeacherId.toString(), "createdBy should be teacher");
  });

  it("Test 3: Student cannot create tag (403 Forbidden)", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");

    try {
      await tagsService.create({
        name: "StudentTag",
        communityId: testCommunityId
      }, {
        user: { _id: testStudentId, role: "Student", schoolId: testSchoolId },
        authenticated: true
      });
      assert.fail("Should have thrown Forbidden error");
    } catch (error: any) {
      assert.strictEqual(error.code, 403, "Should return 403 Forbidden");
      assert.ok(error.message.includes("Admins and Teachers"), "Error message should mention Admins and Teachers");
    }
  });

  it("Test 4: Duplicate tag name in same community rejected", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");

    // Create first tag
    await tagsService.create({
      name: "Quiz",
      communityId: testCommunityId
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Try to create duplicate
    try {
      await tagsService.create({
        name: "QUIZ", // Different case but same name
        communityId: testCommunityId
      }, {
        user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
        authenticated: true
      });
      assert.fail("Should have thrown error for duplicate tag");
    } catch (error: any) {
      assert.ok(error.code === 400 || error.code === 409, "Should return 400 or 409 error");
      assert.ok(error.message.includes("already exists") || error.message.includes("duplicate"), "Error message should mention duplicate/exists");
    }
  });

  it("Test 5: Same tag name allowed in different communities", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");
    const communitiesModel = app.get("mongooseClient").models.communities;

    // Create second community
    const community2 = await communitiesModel.create({
      name: "Test Community 2",
      type: "class",
      classId: testClassId,
      isActive: true
    });

    // Create tag with same name in different community
    const tagData = await tagsService.create({
      name: "Homework", // Same as Test 1
      communityId: community2._id
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    assert.ok(tagData._id, "Tag should be created");
    assert.strictEqual(tagData.name, "homework", "Tag name should match");
    assert.strictEqual(tagData.communityId.toString(), community2._id.toString(), "Should belong to community 2");
  });

  it("Test 6: Find tags by communityId returns only active tags", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");
    const forumTagsModel = app.get("mongooseClient").models.forumTags;

    // Create active tags
    const tag1 = await tagsService.create({
      name: "Active1",
      communityId: testCommunityId
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    const tag2 = await tagsService.create({
      name: "Active2",
      communityId: testCommunityId
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Create inactive tag
    const tag3 = await forumTagsModel.create({
      name: "inactive1",
      communityId: testCommunityId,
      createdBy: testAdminId,
      isActive: false
    });

    // Find tags
    const result = await tagsService.find({
      query: { communityId: testCommunityId },
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Handle both array and paginated results
    const tags = Array.isArray(result) ? result : result.data || [];

    // Should only return active tags
    const tagIds = tags.map((t: any) => t._id.toString());
    assert.ok(tagIds.includes(tag1._id.toString()), "Should include tag1");
    assert.ok(tagIds.includes(tag2._id.toString()), "Should include tag2");
    assert.ok(!tagIds.includes(tag3._id.toString()), "Should NOT include inactive tag3");
  });

  it("Test 7: Update tag name and color", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");

    const tag = await tagsService.create({
      name: "OldName",
      communityId: testCommunityId,
      color: "#000000"
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    const updated = await tagsService.patch(tag._id, {
      name: "NewName",
      color: "#FFFFFF"
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    assert.strictEqual(updated.name, "newname", "Name should be updated and lowercase");
    assert.strictEqual(updated.color, "#FFFFFF", "Color should be updated");
  });

  it("Test 8: Deactivate tag (soft delete)", async function(this: Mocha.Context) {
    this.timeout(5000);

    const tagsService = app.service("forum-tags");
    const forumTagsModel = app.get("mongooseClient").models.forumTags;

    const tag = await tagsService.create({
      name: "ToDelete",
      communityId: testCommunityId
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    await tagsService.remove(tag._id, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Verify in database
    const deletedTag = await forumTagsModel.findById(tag._id).lean();
    assert.ok(deletedTag, "Tag should still exist");
    assert.strictEqual(deletedTag.isActive, false, "Tag should be inactive");
  });
});

