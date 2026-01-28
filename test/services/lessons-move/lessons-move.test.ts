import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Lessons Move Service", () => {
  let server: any;
  let teacherToken: string;
  let testTeacherId: any;
  let testSchoolId: any;
  let testClassId: any;
  let testCourseId: any;
  let testSection1Id: any;
  let testSection2Id: any;
  let testLessonId: any;

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
      schoolName: "Test Lesson Move School",
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
      email: `teacher_lmove_${uniqueId}@test.com`,
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
      name: "Test Lesson Move Class",
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

    // Create course with two sections
    const section1Id = coursesModel.base.Types.ObjectId();
    const section2Id = coursesModel.base.Types.ObjectId();
    const lessonId = coursesModel.base.Types.ObjectId();

    const course = await coursesModel.create({
      title: "Test Lesson Move Course",
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
          _id: section1Id,
          title: "Section 1",
          category: "module",
          order: 0,
          lessons: [
            { _id: lessonId, title: "Movable Lesson", category: "lesson", order: 0, contentType: "text", type: "content" }
          ]
        },
        {
          _id: section2Id,
          title: "Section 2",
          category: "module",
          order: 1,
          lessons: []
        }
      ]
    });
    testCourseId = course._id;
    testSection1Id = section1Id;
    testSection2Id = section2Id;
    testLessonId = lessonId;
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  it("should successfully move lesson between sections", async () => {
    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    const result = await app.service("lessons-move").patch(
      testLessonId.toString(),
      {
        fromSectionId: testSection1Id.toString(),
        toSectionId: testSection2Id.toString(),
        order: 0
      },
      params
    );

    assert.ok(result);
    assert.ok(result.fromSection);
    assert.ok(result.toSection);
    assert.strictEqual(result.fromSection.lessons.length, 0);
    assert.strictEqual(result.toSection.lessons.length, 1);
    assert.strictEqual(result.toSection.lessons[0]._id.toString(), testLessonId.toString());
  });

  it("should fail without courseId", async () => {
    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("lessons-move").patch(
        testLessonId.toString(),
        {
          fromSectionId: testSection1Id.toString(),
          toSectionId: testSection2Id.toString(),
          order: 0
        },
        params
      );
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("courseId") || error.message.includes("Course ID"));
    }
  });

  it("should fail with same fromSectionId and toSectionId", async () => {
    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("lessons-move").patch(
        testLessonId.toString(),
        {
          fromSectionId: testSection1Id.toString(),
          toSectionId: testSection1Id.toString(),
          order: 0
        },
        params
      );
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("must be different"));
    }
  });

  it("should fail with non-existent lesson", async () => {
    const coursesModel = app.get("mongooseClient").models.courses;
    const fakeId = coursesModel.base.Types.ObjectId();

    const params = {
      user: { _id: testTeacherId, role: "Teacher" },
      query: { courseId: testCourseId.toString() },
      headers: { authorization: `Bearer ${teacherToken}` }
    };

    try {
      await app.service("lessons-move").patch(
        fakeId.toString(),
        {
          fromSectionId: testSection1Id.toString(),
          toSectionId: testSection2Id.toString(),
          order: 0
        },
        params
      );
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("not found"));
    }
  });
});
