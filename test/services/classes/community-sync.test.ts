import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Community Sync Integration Tests", () => {
  let server: any;
  let testSchoolId: any;
  let testAdminId: any;
  let testCourse1Id: any;
  let testCourse2Id: any;
  let testCourse3Id: any;

  before(async function() {
    this.timeout(10000);

    const port = app.get("port") || 3031;
    server = app.listen(port);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await clearTestDatabase();

    const schoolsModel = app.get("mongooseClient").models.schools;
    const usersModel = app.get("mongooseClient").models.users;
    const coursesModel = app.get("mongooseClient").models.courses;

    // Create test school
    const school = await schoolsModel.create({
      schoolName: "Test Community Sync School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    // Create admin user
    const uniqueId = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const testOTP = 111111;
    
    const adminEmail = `admin_community_sync_${uniqueId}_${randomStr}@test.com`;
    const adminMobile = `+1${uniqueId}${Math.random().toString().substr(2, 6)}`;
    
    const admin = await usersModel.create({
      firstName: "Test",
      lastName: "Admin",
      email: adminEmail,
      mobileNo: adminMobile,
      role: "Admin",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testAdminId = admin._id;

    // Get admin token (for future use if needed)
    // const adminAuth = await app.service("authentication").create({
    //   strategy: "otp",
    //   mobileNo: adminMobile,
    //   otp: testOTP
    // }, {});
    // adminToken = adminAuth.accessToken;

    // Create test courses (we'll create class later in tests)
    const course1 = await coursesModel.create({
      title: "Sync Test Course 1",
      courseDescription: "Course 1",
      status: "draft",
      courseImage: {
        objectUrl: "https://example.com/course1.jpg",
        fileName: "course1.jpg",
        fileType: "image/jpeg",
        fileSize: 1024,
        status: "finished"
      }
    });
    testCourse1Id = course1._id;

    const course2 = await coursesModel.create({
      title: "Sync Test Course 2",
      courseDescription: "Course 2",
      status: "draft",
      courseImage: {
        objectUrl: "https://example.com/course2.jpg",
        fileName: "course2.jpg",
        fileType: "image/jpeg",
        fileSize: 1024,
        status: "finished"
      }
    });
    testCourse2Id = course2._id;

    const course3 = await coursesModel.create({
      title: "Sync Test Course 3",
      courseDescription: "Course 3",
      status: "draft",
      courseImage: {
        objectUrl: "https://example.com/course3.jpg",
        fileName: "course3.jpg",
        fileType: "image/jpeg",
        fileSize: 1024,
        status: "finished"
      }
    });
    testCourse3Id = course3._id;
  });

  after(async function() {
    this.timeout(10000);
    
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await clearTestDatabase();
  });

  it("Test 1: Create class with enableClassForum should create class community", async function(this: Mocha.Context) {
    this.timeout(5000);

    const classesService = app.service("classes");
    const communitiesModel = app.get("mongooseClient").models.communities;

    // Create class with class forum enabled
    const classData = await classesService.create({
      name: "Test Class with Forum",
      status: "Active",
      schoolId: testSchoolId,
      forumSettings: {
        enableClassForum: true,
        enableCourseForum: false
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Verify classCommunityId is populated
    assert.ok(classData.forumSettings.classCommunityId, "forumSettings.classCommunityId should be populated");

    // Query communities collection
    const community = await communitiesModel.findById(classData.forumSettings.classCommunityId).lean();
    assert.ok(community, "Community should exist in database");
    assert.strictEqual(community.type, "class", "Community type should be 'class'");
    assert.strictEqual(community.classId.toString(), classData._id.toString(), "classId should match");
    assert.strictEqual(community.isActive, true, "Community should be active");

    // Cleanup
    await classesService.remove(classData._id, { user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId } });
  });

  it("Test 2: Update class to enable course forums should create course communities", async function(this: Mocha.Context) {
    this.timeout(5000);

    const classesService = app.service("classes");
    const communitiesModel = app.get("mongooseClient").models.communities;
    const coursesModel = app.get("mongooseClient").models.courses;

    // Create class without forums
    const classData = await classesService.create({
      name: "Test Class for Course Forums",
      status: "Active",
      schoolId: testSchoolId,
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: false
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Update courses to belong to this class
    await coursesModel.updateMany(
      { _id: { $in: [testCourse1Id, testCourse2Id] } },
      { classId: classData._id }
    );

    // Patch to enable course forums with all courses
    const updated = await classesService.patch(classData._id, {
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: true,
        enableAllCourses: true
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Verify selectedCourses array is populated
    assert.ok(updated.forumSettings.selectedCourses, "selectedCourses should exist");
    assert.ok(updated.forumSettings.selectedCourses.length >= 2, "Should have at least 2 courses");

    // Verify each course has communityId
    for (const sc of updated.forumSettings.selectedCourses) {
      assert.ok(sc.courseId, "Should have courseId");
      assert.ok(sc.communityId, "Should have communityId");

      // Verify community exists in database
      const community = await communitiesModel.findById(sc.communityId).lean();
      assert.ok(community, "Community should exist");
      assert.strictEqual(community.type, "course", "Community type should be 'course'");
      assert.strictEqual(community.classId.toString(), classData._id.toString(), "classId should match");
    }

    // Cleanup
    await classesService.remove(classData._id, { user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId } });
  });

  it("Test 3: Disable class forum should deactivate community", async function(this: Mocha.Context) {
    this.timeout(5000);

    const classesService = app.service("classes");
    const communitiesModel = app.get("mongooseClient").models.communities;

    // Create class with forum enabled
    const classData = await classesService.create({
      name: "Test Class to Disable",
      status: "Active",
      schoolId: testSchoolId,
      forumSettings: {
        enableClassForum: true,
        enableCourseForum: false
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    const communityId = classData.forumSettings.classCommunityId;
    assert.ok(communityId, "Community should be created");

    // Disable class forum
    const updated = await classesService.patch(classData._id, {
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: false
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Verify classCommunityId is null
    assert.strictEqual(updated.forumSettings.classCommunityId, null, "classCommunityId should be null");

    // Query community from DB
    const community = await communitiesModel.findById(communityId).lean();
    assert.ok(community, "Community should still exist (soft delete)");
    assert.strictEqual(community.isActive, false, "Community should be inactive");

    // Cleanup
    await classesService.remove(classData._id, { user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId } });
  });

  it("Test 4: Change selected courses should create new and deactivate old communities", async function(this: Mocha.Context) {
    this.timeout(5000);

    const classesService = app.service("classes");
    const communitiesModel = app.get("mongooseClient").models.communities;
    const coursesModel = app.get("mongooseClient").models.courses;

    // Create class
    const classData = await classesService.create({
      name: "Test Class for Course Change",
      status: "Active",
      schoolId: testSchoolId,
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: false
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    // Assign courses to class
    await coursesModel.updateMany(
      { _id: { $in: [testCourse1Id, testCourse2Id, testCourse3Id] } },
      { classId: classData._id }
    );

    // Enable forums for first 2 courses
    const step1 = await classesService.patch(classData._id, {
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: true,
        enableAllCourses: false,
        selectedCourses: [
          { courseId: testCourse1Id },
          { courseId: testCourse2Id }
        ]
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    assert.strictEqual(step1.forumSettings.selectedCourses.length, 2, "Should have 2 courses");
    const oldCommunityIds = step1.forumSettings.selectedCourses.map((sc: any) => sc.communityId.toString());

    // Change to different 2 courses
    const step2 = await classesService.patch(classData._id, {
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: true,
        enableAllCourses: false,
        selectedCourses: [
          { courseId: testCourse2Id },
          { courseId: testCourse3Id }
        ]
      }
    }, {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      authenticated: true
    });

    assert.strictEqual(step2.forumSettings.selectedCourses.length, 2, "Should have 2 courses");
    const newCommunityIds = step2.forumSettings.selectedCourses.map((sc: any) => sc.communityId.toString());

    // Course1's community should be deactivated
    const course1OldCommunity = oldCommunityIds.find((id: string) => 
      !newCommunityIds.includes(id)
    );
    
    if (course1OldCommunity) {
      const deactivatedCommunity = await communitiesModel.findById(course1OldCommunity).lean();
      // Community might have been for course1, check if it's deactivated
      if (deactivatedCommunity && deactivatedCommunity.courseId.toString() === testCourse1Id.toString()) {
        assert.strictEqual(deactivatedCommunity.isActive, false, "Old community should be deactivated");
      }
    }

    // New communities should be active
    for (const communityId of newCommunityIds) {
      const community = await communitiesModel.findById(communityId).lean();
      assert.ok(community, "Community should exist");
      assert.strictEqual(community.isActive, true, "New community should be active");
    }

    // Cleanup
    await classesService.remove(classData._id, { user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId } });
  });
});

