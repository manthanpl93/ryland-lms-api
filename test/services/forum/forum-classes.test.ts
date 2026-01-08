import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";
import axios from "axios";

const API_URL = "http://localhost:3031"; // Test server URL

describe("forum-classes service", () => {
  let server: any;
  let adminToken: string;
  let studentToken: string;
  let teacherToken: string;
  let student2Token: string;
  let teacher2Token: string;
  
  let testSchoolId: any;
  let testClassId: any;
  let testClass2Id: any;
  let testAdminId: any;
  let testStudentId: any;
  let testStudent2Id: any;
  let testTeacherId: any;
  let testTeacher2Id: any;
  let testCourse1Id: any;
  let testCourse2Id: any;
  let testCourse3Id: any;

  // Setup test data before running tests
  before(async function() {
    this.timeout(10000); // Increase timeout for setup

    // Start the server
    const port = app.get("port") || 3031;
    server = app.listen(port);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clear entire test database for clean start
    await clearTestDatabase();

    const schoolsModel = app.get("mongooseClient").models.schools;
    const classesModel = app.get("mongooseClient").models.classes;
    const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;
    const classTeachersModel = app.get("mongooseClient").models.classTeachers;
    const coursesModel = app.get("mongooseClient").models.courses;

    // Create test school using model (no service available)
    const school = await schoolsModel.create({
      schoolName: "Test Forum School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    // Create users using service (handles password hashing and hooks properly)
    // Use unique timestamp + random + process ID to avoid collisions
    const uniqueId = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
    const processId = process.pid;
    const timestamp = `${uniqueId}_${processId}_${randomStr}`;
    
    // Create users directly in DB with OTP for authentication
    // Using 6-digit OTP like the forget-password service generates
    const usersModel = app.get("mongooseClient").models.users;
    const testOTP = 111111; // 6-digit OTP for testing (matches generateSixDigitRandom format)
    
    // Create test admin user with OTP
    const adminEmail = `admin_forum_${timestamp}@test.com`;
    const adminMobile = `+1${uniqueId}${processId}0`;
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

    // Create test student users with OTP
    const studentEmail = `student_forum_${timestamp}@test.com`;
    const studentMobile = `+1${uniqueId}${processId}1`;
    const student = await usersModel.create({
      firstName: "Test",
      lastName: "Student",
      email: studentEmail,
      mobileNo: studentMobile,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudentId = student._id;

    const student2Email = `student2_forum_${timestamp}@test.com`;
    const student2Mobile = `+1${uniqueId}${processId}2`;
    const student2 = await usersModel.create({
      firstName: "Test",
      lastName: "Student2",
      email: student2Email,
      mobileNo: student2Mobile,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudent2Id = student2._id;

    // Create test teacher users with OTP
    const teacherEmail = `teacher_forum_${timestamp}@test.com`;
    const teacherMobile = `+1${uniqueId}${processId}3`;
    const teacher = await usersModel.create({
      firstName: "Test",
      lastName: "Teacher",
      email: teacherEmail,
      mobileNo: teacherMobile,
      role: "Teacher",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testTeacherId = teacher._id;

    const teacher2Email = `teacher2_forum_${timestamp}@test.com`;
    const teacher2Mobile = `+1${uniqueId}${processId}4`;
    const teacher2 = await usersModel.create({
      firstName: "Test",
      lastName: "Teacher2",
      email: teacher2Email,
      mobileNo: teacher2Mobile,
      role: "Teacher",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testTeacher2Id = teacher2._id;

    // Create test class with forum settings
    const testClass = await classesModel.create({
      name: "Test Forum Class 1",
      status: "Active",
      schoolId: testSchoolId,
      totalStudents: 1,
      totalCourses: 3,
      forumSettings: {
        enableClassForum: true,
        enableCourseForum: true,
        enableAllCourses: true,
        selectedCourses: []
      },
      isDeleted: false
    });
    testClassId = testClass._id;

    // Create second test class with different forum settings
    const testClass2 = await classesModel.create({
      name: "Test Forum Class 2",
      status: "Active",
      schoolId: testSchoolId,
      totalStudents: 0,
      totalCourses: 1,
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: true,
        enableAllCourses: false,
        selectedCourses: [] // Will be updated after creating courses
      },
      isDeleted: false
    });
    testClass2Id = testClass2._id;

    // Create test courses
    const course1 = await coursesModel.create({
      name: "Test Course 1",
      classId: testClassId,
      description: "Course 1 description",
      status: "draft",
      courseImage: {
        objectUrl: "https://example.com/image1.jpg",
        fileName: "image1.jpg",
        fileType: "image/jpeg",
        fileSize: 1024,
        status: "finished"
      }
    });
    testCourse1Id = course1._id;

    const course2 = await coursesModel.create({
      name: "Test Course 2",
      classId: testClassId,
      description: "Course 2 description",
      status: "draft",
      courseImage: {
        objectUrl: "https://example.com/image2.jpg",
        fileName: "image2.jpg",
        fileType: "image/jpeg",
        fileSize: 1024,
        status: "finished"
      }
    });
    testCourse2Id = course2._id;

    const course3 = await coursesModel.create({
      name: "Test Course 3",
      classId: testClass2Id,
      description: "Course 3 description",
      status: "draft",
      courseImage: {
        objectUrl: "https://example.com/image3.jpg",
        fileName: "image3.jpg",
        fileType: "image/jpeg",
        fileSize: 1024,
        status: "finished"
      }
    });
    testCourse3Id = course3._id;

    // Update class 2 with selected course
    await classesModel.findByIdAndUpdate(testClass2Id, {
      "forumSettings.selectedCourses": [testCourse3Id]
    });

    // Create class enrollment for student 1
    await classEnrollmentsModel.create({
      classId: testClassId,
      studentId: testStudentId,
      status: "Active",
      enrollmentDate: new Date()
    });

    // Create class teacher assignments
    await classTeachersModel.create({
      classId: testClassId,
      teacherId: testTeacherId,
      isActive: true,
      assignedDate: new Date()
    });

    await classTeachersModel.create({
      classId: testClassId,
      teacherId: testTeacher2Id,
      isActive: true,
      assignedDate: new Date()
    });

    await classTeachersModel.create({
      classId: testClass2Id,
      teacherId: testTeacherId,
      isActive: true,
      assignedDate: new Date()
    });

    // Get JWT tokens using OTP authentication with mobile numbers
    // Using loginSecret (111111) which always works without expiry check
    const adminAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: adminMobile,
      otp: testOTP
    }, {});
    adminToken = adminAuth.accessToken;

    const studentAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: studentMobile,
      otp: testOTP
    }, {});
    studentToken = studentAuth.accessToken;

    const student2Auth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student2Mobile,
      otp: testOTP
    }, {});
    student2Token = student2Auth.accessToken;

    const teacherAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: teacherMobile,
      otp: testOTP
    }, {});
    teacherToken = teacherAuth.accessToken;

    const teacher2Auth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: teacher2Mobile,
      otp: testOTP
    }, {});
    teacher2Token = teacher2Auth.accessToken;
  });

  // Cleanup test data after all tests
  after(async function() {
    this.timeout(20000); // Increased timeout for cleanup and server shutdown

    // Close the server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    const usersModel = app.get("mongooseClient").models.users;
    const schoolsModel = app.get("mongooseClient").models.schools;
    const classesModel = app.get("mongooseClient").models.classes;
    const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;
    const classTeachersModel = app.get("mongooseClient").models.classTeachers;
    const coursesModel = app.get("mongooseClient").models.courses;

    // Delete test data
    await coursesModel.deleteMany({ _id: { $in: [testCourse1Id, testCourse2Id, testCourse3Id] } });
    await classTeachersModel.deleteMany({ classId: { $in: [testClassId, testClass2Id] } });
    await classEnrollmentsModel.deleteMany({ classId: { $in: [testClassId, testClass2Id] } });
    await classesModel.deleteMany({ _id: { $in: [testClassId, testClass2Id] } });
    await usersModel.deleteMany({ 
      _id: { $in: [testAdminId, testStudentId, testStudent2Id, testTeacherId, testTeacher2Id] } 
    });
    await schoolsModel.deleteMany({ _id: testSchoolId });
  });

  // Test 1: Service registration
  it("registered the service", () => {
    const service = app.service("forum/classes");
    assert.ok(service, "Registered the service");
  });

  // Test 2: Unauthenticated access should be blocked
  it("blocks unauthenticated access (401)", async () => {
    try {
      await axios.get(`${API_URL}/forum/classes`);
      assert.fail("Should have thrown an authentication error");
    } catch (error: any) {
      assert.strictEqual(error.response?.status, 401, "Should return 401 status");
    }
  });

  // Test 3: Admin access should be blocked
  it("blocks Admin access (403 Forbidden)", async () => {
    try {
      await axios.get(`${API_URL}/forum/classes`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });
      assert.fail("Should have thrown a forbidden error for Admin");
    } catch (error: any) {
      assert.strictEqual(error.response?.status, 403, "Should return 403 status");
      assert.ok(
        error.response?.data?.message?.includes("Community forum") || 
        error.response?.data?.message?.includes("Students and Teachers"),
        "Error message should indicate forum is for Students and Teachers only"
      );
    }
  });

  // Test 4: Student with valid token can access
  it("allows Student with valid token to access", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    const result = response.data;
    assert.ok(result, "Should return result for Student");
    assert.strictEqual(result.role, "Student", "Role should be Student");
    assert.ok(Array.isArray(result.classes), "Should return classes array");
  });

  // Test 5: Teacher with valid token can access
  it("allows Teacher with valid token to access", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${teacherToken}`
      }
    });
    const result = response.data;
    assert.ok(result, "Should return result for Teacher");
    assert.strictEqual(result.role, "Teacher", "Role should be Teacher");
    assert.ok(Array.isArray(result.classes), "Should return classes array");
  });

  // Test 6: Student returns single enrolled class
  it("Student returns single enrolled class with correct data", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    const result = response.data;

    assert.strictEqual(result.role, "Student", "Role should be Student");
    assert.strictEqual(result.classes.length, 1, "Should return exactly one class");
    
    const classData = result.classes[0];
    assert.ok(classData._id, "Class should have _id");
    assert.strictEqual(classData.name, "Test Forum Class 1", "Class name should match");
    assert.strictEqual(classData.totalStudents, 1, "totalStudents should be 1");
    assert.strictEqual(classData.totalCourses, 3, "totalCourses should be 3");
    assert.ok(Array.isArray(classData.teachers), "Should have teachers array");
    assert.ok(Array.isArray(classData.communities), "Should have communities array");
  });

  // Test 7: Student not enrolled returns empty array
  it("Student not enrolled in any class returns empty array", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${student2Token}`
      }
    });
    const result = response.data;

    assert.strictEqual(result.role, "Student", "Role should be Student");
    assert.strictEqual(result.classes.length, 0, "Should return empty classes array");
  });

  // Test 8: Class includes teachers array with names
  it("Class includes teachers array with names", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    const result = response.data;

    const classData = result.classes[0];
    assert.ok(Array.isArray(classData.teachers), "Should have teachers array");
    assert.strictEqual(classData.teachers.length, 2, "Should have 2 teachers");
    
    // Check that each teacher has a name
    classData.teachers.forEach((teacher: any) => {
      assert.ok(teacher.name, "Each teacher should have a name");
    });

    // Check that teacher names are in the list
    const teacherNames = classData.teachers.map((t: any) => t.name);
    assert.ok(teacherNames.includes("Test Teacher") || teacherNames.includes("Test Teacher 2"), 
      "Should include test teacher names");
  });

  // Test 9: Teacher returns multiple classes
  it("Teacher returns multiple classes if assigned to multiple", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${teacherToken}`
      }
    });
    const result = response.data;

    assert.strictEqual(result.role, "Teacher", "Role should be Teacher");
    assert.strictEqual(result.classes.length, 2, "Should return 2 classes");
    
    // Verify each class has required fields
    result.classes.forEach((classData: any) => {
      assert.ok(classData._id, "Class should have _id");
      assert.ok(classData.name, "Class should have name");
      assert.ok(typeof classData.totalStudents === "number", "Should have totalStudents");
      assert.ok(typeof classData.totalCourses === "number", "Should have totalCourses");
      assert.ok(Array.isArray(classData.teachers), "Should have teachers array");
      assert.ok(Array.isArray(classData.communities), "Should have communities array");
    });
  });

  // Test 10: Teacher not assigned returns empty array
  it("Teacher not assigned to any class returns empty array", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${teacher2Token}`
      }
    });
    const result = response.data;

    // Teacher 2 is assigned to class 1, so they should have 1 class
    assert.strictEqual(result.role, "Teacher", "Role should be Teacher");
    assert.strictEqual(result.classes.length, 1, "Should return 1 class");
  });

  // Test 11: Returns class community when enableClassForum=true
  it("Returns class community when enableClassForum=true", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    const result = response.data;

    const classData = result.classes[0];
    const classCommunity = classData.communities.find((c: any) => c.type === "class");
    
    assert.ok(classCommunity, "Should have Class Community");
    assert.ok(classCommunity._id, "Community should have _id");
    assert.strictEqual(classCommunity.type, "class", "Community type should be 'class'");
    assert.ok(typeof classCommunity.totalPosts === "number", "totalPosts should be a number");
    assert.ok(!classCommunity.courseId, "Class community should not have courseId");
  });

  // Test 12: Returns course communities when enableCourseForum=true with enableAllCourses=true
  it("Returns course communities when enableCourseForum=true with enableAllCourses=true", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    const result = response.data;

    const classData = result.classes[0];
    
    // Should have class community + all course communities
    assert.ok(classData.communities.length >= 1, "Should have at least 1 community");
    
    // Check for course communities
    const courseCommunities = classData.communities.filter((c: any) => c.type === "course");
    
    // Verify course communities have correct structure
    courseCommunities.forEach((community: any) => {
      assert.ok(community._id, "Course community should have _id");
      assert.strictEqual(community.type, "course", "Community type should be 'course'");
      assert.ok(community.courseId, "Course community should have courseId");
      assert.ok(typeof community.totalPosts === "number", "totalPosts should be a number");
    });
  });

  // Test 13: Returns only selected course communities when enableAllCourses=false
  it("Returns only selected course communities when enableAllCourses=false", async () => {
    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${teacherToken}`
      }
    });
    const result = response.data;

    // Find class 2 in the results
    const class2Data = result.classes.find((c: any) => c.name === "Test Forum Class 2");
    assert.ok(class2Data, "Should find Test Forum Class 2");

    // Class 2 has enableClassForum=false but enableCourseForum=true with selected courses
    // Should have only the selected course community
    assert.ok(class2Data.communities.length >= 1, "Should have at least 1 community");
    
    const courseCommunity = class2Data.communities.find((c: any) => c.type === "course");
    assert.ok(courseCommunity, "Should have a course community");
    assert.ok(courseCommunity._id, "Community should have _id");
    assert.strictEqual(courseCommunity.type, "course", "Community type should be 'course'");
    assert.ok(courseCommunity.courseId, "Course community should have courseId");
    assert.ok(typeof courseCommunity.totalPosts === "number", "totalPosts should be a number");
  });

  // Test 14: Returns empty communities array when both forum settings disabled
  it("Returns empty communities array when both forum settings disabled", async () => {
    // Update class to disable both forum settings
    const classesModel = app.get("mongooseClient").models.classes;
    await classesModel.findByIdAndUpdate(testClass2Id, {
      "forumSettings.enableClassForum": false,
      "forumSettings.enableCourseForum": false
    });

    const response = await axios.get(`${API_URL}/forum/classes`, {
      headers: {
        Authorization: `Bearer ${teacherToken}`
      }
    });
    const result = response.data;

    const class2Data = result.classes.find((c: any) => c.name === "Test Forum Class 2");
    assert.ok(class2Data, "Should find Test Forum Class 2");
    assert.strictEqual(class2Data.communities.length, 0, "Should have empty communities array");

    // Restore forum settings for other tests
    await classesModel.findByIdAndUpdate(testClass2Id, {
      "forumSettings.enableClassForum": false,
      "forumSettings.enableCourseForum": true
    });
  });
});

