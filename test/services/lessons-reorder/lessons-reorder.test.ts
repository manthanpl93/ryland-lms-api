import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Lessons Reorder Service", () => {
  let server: any;
  let teacherToken: string;
  let testTeacherId: any;
  let testSchoolId: any;
  let testClassId: any;
  let testCourseId: any;
  let testSectionId: any;
  let testLessonIds: any[];

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
      schoolName: "Test Lesson Reorder School",
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
      email: `teacher_lreorder_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}1`,
      role: "Teacher",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testTeacherId = teacher._id;

    // Authenticate teacher
    const teacherAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: teacher.mobileNo,
      otp: testOTP
    }, {});
    teacherToken = teacherAuth.accessToken;

    // Create class
    const testClass = await classesModel.create({
      name: "Test Lesson Reorder Class",
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

    // Create course with section and lessons
    const sectionId = coursesModel.base.Types.ObjectId();
    const lessonIds = [
      coursesModel.base.Types.ObjectId(),
      coursesModel.base.Types.ObjectId(),
      coursesModel.base.Types.ObjectId()
    ];

    const course = await coursesModel.create({
      title: "Test Lesson Reorder Course",
      classId: testClassId,
      courseImage: {
        status: "finished",
        objectUrl: "https://test.com/image.jpg",
        fileName: "test.jpg",
        fileType: "image/jpeg",
        fileSize: 1024
      },
      outline: [
        {
          _id: sectionId,
          title: "Test Section",
          category: "module",
          order: 0,
          lessons: [
            { _id: lessonIds[0], title: "Lesson 1", category: "lesson", order: 0, contentType: "text", type: "content" },
            { _id: lessonIds[1], title: "Lesson 2", category: "lesson", order: 1, contentType: "text", type: "content" },
            { _id: lessonIds[2], title: "Lesson 3", category: "lesson", order: 2, contentType: "text", type: "content" }
          ]
        }
      ]
    });
    testCourseId = course._id;
    testSectionId = sectionId;
    testLessonIds = lessonIds;
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  it("should successfully reorder lessons within section", async () => {
    const lessonOrders = [
      { _id: testLessonIds[2].toString(), order: 0 },
      { _id: testLessonIds[0].toString(), order: 1 },
      { _id: testLessonIds[1].toString(), order: 2 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { 
        courseId: testCourseId.toString(),
        sectionId: testSectionId.toString()
      },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    const result = await app.service("lessons-reorder").patch(null, { lessonOrders }, params);

    assert.ok(result);
    assert.ok(result.section);
    assert.strictEqual(result.section.lessons.length, 3);
    assert.strictEqual(result.section.lessons[0].title, "Lesson 3");
    assert.strictEqual(result.section.lessons[1].title, "Lesson 1");
    assert.strictEqual(result.section.lessons[2].title, "Lesson 2");
  });

  it("should fail without courseId", async () => {
    const lessonOrders = [
      { _id: testLessonIds[0].toString(), order: 0 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { sectionId: testSectionId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("lessons-reorder").patch(null, { lessonOrders }, params);
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("courseId") || error.message.includes("Course ID"));
    }
  });

  it("should fail without sectionId", async () => {
    const lessonOrders = [
      { _id: testLessonIds[0].toString(), order: 0 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("lessons-reorder").patch(null, { lessonOrders }, params);
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("Section ID"));
    }
  });

  it("should fail with invalid lesson ID", async () => {
    const coursesModel = app.get("mongooseClient").models.courses;
    const fakeId = coursesModel.base.Types.ObjectId();
    
    const lessonOrders = [
      { _id: fakeId.toString(), order: 0 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: {
        courseId: testCourseId.toString(),
        sectionId: testSectionId.toString()
      },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("lessons-reorder").patch(null, { lessonOrders }, params);
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("not found"));
    }
  });

  it("should handle negative order values", async () => {
    const lessonOrders = [
      { _id: testLessonIds[0].toString(), order: -1 },
      { _id: testLessonIds[1].toString(), order: 0 },
      { _id: testLessonIds[2].toString(), order: 1 }
    ];

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: {
        courseId: testCourseId.toString(),
        sectionId: testSectionId.toString()
      },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    const result = await app.service("lessons-reorder").patch(null, { lessonOrders }, params);

    assert.ok(result);
    assert.ok(result.section);
    assert.strictEqual(result.section.lessons[0].order, -1);
  });
});
