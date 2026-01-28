import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Course Sections Reorder Service", () => {
  let server: any;
  let teacherToken: string;
  let adminToken: string;
  let studentToken: string;
  let testTeacherId: any;
  let testAdminId: any;
  let testStudentId: any;
  let testSchoolId: any;
  let testClassId: any;
  let testCourseId: any;
  let testSectionIds: any[];

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
    const coursesModel = app.get("mongooseClient").models.courses;

    const uniqueId = Date.now();
    const testOTP = 111111;

    // Create school
    const school = await schoolsModel.create({
      schoolName: "Test Reorder School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    // Create teacher
    const teacher = await usersModel.create({
      firstName: "Teacher",
      lastName: "Test",
      email: `teacher_reorder_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}1`,
      role: "Teacher",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testTeacherId = teacher._id;

    // Create admin
    const admin = await usersModel.create({
      firstName: "Admin",
      lastName: "Test",
      email: `admin_reorder_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}2`,
      role: "Admin",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testAdminId = admin._id;

    // Create student
    const student = await usersModel.create({
      firstName: "Student",
      lastName: "Test",
      email: `student_reorder_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}3`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudentId = student._id;

    // Authenticate users
    const teacherAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: teacher.mobileNo,
      otp: testOTP
    }, {});
    teacherToken = teacherAuth.accessToken;

    const adminAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: admin.mobileNo,
      otp: testOTP
    }, {});
    adminToken = adminAuth.accessToken;

    const studentAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student.mobileNo,
      otp: testOTP
    }, {});
    studentToken = studentAuth.accessToken;

    // Create class
    const testClass = await classesModel.create({
      name: "Test Reorder Class",
      status: "Active",
      schoolId: testSchoolId
    });
    testClassId = testClass._id;

    // Assign teacher to class
    await classTeachersModel.create({
      classId: testClassId,
      teacherId: testTeacherId,
      status: "Active"
    });

    // Create course with sections
    const course = await coursesModel.create({
      title: "Test Reorder Course",
      classId: testClassId,
      courseImage: {
        status: "finished",
        objectUrl: "https://test.com/image.jpg",
        fileName: "test.jpg",
        fileType: "image/jpeg",
        fileSize: 1024
      },
      outline: [
        { _id: coursesModel.base.Types.ObjectId(), title: "Section 1", category: "module", order: 0, lessons: [] },
        { _id: coursesModel.base.Types.ObjectId(), title: "Section 2", category: "module", order: 1, lessons: [] },
        { _id: coursesModel.base.Types.ObjectId(), title: "Section 3", category: "module", order: 2, lessons: [] }
      ]
    });
    testCourseId = course._id;
    testSectionIds = course.outline.map((s: any) => s._id);
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  it("should successfully reorder sections (Teacher)", async () => {
    const sectionOrders = [
      { _id: testSectionIds[2].toString(), order: 0 },
      { _id: testSectionIds[0].toString(), order: 1 },
      { _id: testSectionIds[1].toString(), order: 2 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    const result = await app.service("course-sections-reorder").patch(null, { sectionOrders }, params);

    assert.ok(result);
    assert.ok(result.outline);
    assert.strictEqual(result.outline.length, 3);
    assert.strictEqual(result.outline[0].title, "Section 3");
    assert.strictEqual(result.outline[1].title, "Section 1");
    assert.strictEqual(result.outline[2].title, "Section 2");
  });

  it("should fail without courseId", async () => {
    const sectionOrders = [
      { _id: testSectionIds[0].toString(), order: 0 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("course-sections-reorder").patch(null, { sectionOrders }, params);
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("courseId") || error.message.includes("Course ID"));
    }
  });

  it("should fail with empty sectionOrders array", async () => {
    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("course-sections-reorder").patch(null, { sectionOrders: [] }, params);
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("cannot be empty"));
    }
  });

  it("should fail with invalid section ID", async () => {
    const coursesModel = app.get("mongooseClient").models.courses;
    const fakeId = coursesModel.base.Types.ObjectId();
    
    const sectionOrders = [
      { _id: fakeId.toString(), order: 0 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("course-sections-reorder").patch(null, { sectionOrders }, params);
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("not found"));
    }
  });

  it("should work for Admin role", async () => {
    const sectionOrders = [
      { _id: testSectionIds[1].toString(), order: 0 },
      { _id: testSectionIds[0].toString(), order: 1 },
      { _id: testSectionIds[2].toString(), order: 2 }
    ];

    const params = {
      user: { _id: testAdminId, role: "Admin", schoolId: testSchoolId },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${adminToken}` }
    };

    const result = await app.service("course-sections-reorder").patch(null, { sectionOrders }, params);

    assert.ok(result);
    assert.strictEqual(result.outline[0].title, "Section 2");
  });

  it("should fail for Student role", async () => {
    const sectionOrders = [
      { _id: testSectionIds[0].toString(), order: 0 }
    ];

    const params = {
      user: { _id: testStudentId, role: "Student" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${studentToken}` }
    };

    try {
      await app.service("course-sections-reorder").patch(null, { sectionOrders }, params);
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("permission") || error.message.includes("access"));
    }
  });

  it("should handle fractional order values", async () => {
    const sectionOrders = [
      { _id: testSectionIds[0].toString(), order: 0.5 },
      { _id: testSectionIds[1].toString(), order: 1.5 },
      { _id: testSectionIds[2].toString(), order: 2.5 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    const result = await app.service("course-sections-reorder").patch(null, { sectionOrders }, params);

    assert.ok(result);
    assert.ok(result.outline);
    assert.strictEqual(result.outline.length, 3);
  });
});
