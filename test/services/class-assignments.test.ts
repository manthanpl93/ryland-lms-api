import assert from "assert";
import app from "../../src/app";
import { clearTestDatabase } from "../helpers/database";
import axios from "axios";

// Pre-defined test data for consistent test execution
const testUsers = [
  { email: "test.student1@example.com", mobile: "+15551234001" },
  { email: "test.student2@example.com", mobile: "+15551234002" },
  { email: "test.student3@example.com", mobile: "+15551234003" },
  { email: "test.student4@example.com", mobile: "+15551234004" },
  { email: "test.teacher1@example.com", mobile: "+15551234005" },
  { email: "test.teacher2@example.com", mobile: "+15551234006" },
  { email: "test.teacher3@example.com", mobile: "+15551234007" },
  { email: "test.teacher4@example.com", mobile: "+15551234008" },
  { email: "test.student5@example.com", mobile: "+15551234009" },
  { email: "test.teacher5@example.com", mobile: "+15551234010" },
  { email: "test.student6@example.com", mobile: "+15551234011" },
  { email: "test.teacher6@example.com", mobile: "+15551234012" },
  { email: "test.admin1@example.com", mobile: "+15551234013" },
];

describe("Class Assignment Feature - Integration Tests", () => {
  let server: any;
  let baseURL: string;
  let adminToken: string;
  let testSchoolId: any;
  let testClassId1: any;
  let testClassId2: any;
  let testClassId3: any;

  before(async function() {
    this.timeout(10000);
    
    const port = app.get("port") || 3031;
    server = app.listen(port);
    baseURL = `http://localhost:${port}`;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(async function() {
    this.timeout(10000);
    await clearTestDatabase();

    const usersModel = app.get("mongooseClient").models.users;
    const schoolsModel = app.get("mongooseClient").models.schools;
    const classesModel = app.get("mongooseClient").models.classes;

    // Create test school
    const school = await schoolsModel.create({
      schoolName: "Test School",
      schoolType: "private",
      address: "123 Test St",
      city: "Test City",
      status: "active",
    });
    testSchoolId = school._id;

    // Create test admin user with OTP
    const testOTP = 111111;
    const uniqueId = Date.now();
    const admin = await usersModel.create({
      firstName: "Test",
      lastName: "Admin",
      email: `admin_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}${Math.random().toString().substr(2, 6)}`,
      role: "Admin",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date(),
    });

    // Authenticate admin
    const authResponse = await axios.post(`${baseURL}/authentication`, {
      strategy: "otp",
      mobileNo: admin.mobileNo,
      otp: testOTP,
    });
    adminToken = authResponse.data.accessToken;

    // Create test classes
    const class1Response = await axios.post(
      `${baseURL}/classes`,
      {
        name: "Test Class 1",
        schoolId: testSchoolId.toString(),
        status: "Active",
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testClassId1 = class1Response.data._id;

    const class2Response = await axios.post(
      `${baseURL}/classes`,
      {
        name: "Test Class 2",
        schoolId: testSchoolId.toString(),
        status: "Active",
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testClassId2 = class2Response.data._id;

    const class3Response = await axios.post(
      `${baseURL}/classes`,
      {
        name: "Test Class 3",
        schoolId: testSchoolId.toString(),
        status: "Active",
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testClassId3 = class3Response.data._id;
  });

  after(async function() {
    this.timeout(10000);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearTestDatabase();
  });

  describe("syncClassAssignments Hook - Student Enrollments", () => {
    it("should create enrollment when student is created with classId", async function() {
      this.timeout(5000);
      
      const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;

      const studentResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Student",
          email: testUsers[0].email,
          password: "password123",
          mobileNo: testUsers[0].mobile,
          role: "Student",
          status: "Active",
          classId: testClassId1.toString(),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const enrollments = await classEnrollmentsModel.find({
        studentId: studentResponse.data._id,
      });

      assert.strictEqual(enrollments.length, 1, "Should have created one enrollment");
      assert.strictEqual(enrollments[0].classId.toString(), testClassId1.toString());
      assert.strictEqual(enrollments[0].status, "Active");
    });

    it("should replace enrollment when student classId is updated", async function() {
      this.timeout(5000);

      const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;

      const studentResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Student2",
          email: testUsers[1].email,
          password: "password123",
          mobileNo: testUsers[1].mobile,
          role: "Student",
          status: "Active",
          classId: testClassId1.toString(),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      await axios.patch(
        `${baseURL}/users/${studentResponse.data._id}`,
        { classId: testClassId2.toString() },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const enrollments = await classEnrollmentsModel.find({
        studentId: studentResponse.data._id,
      });

      assert.strictEqual(enrollments.length, 1, "Should still have only one enrollment");
      assert.strictEqual(enrollments[0].classId.toString(), testClassId2.toString(), "Should have updated to class 2");
    });

    it("should remove enrollment when classId is set to null", async function() {
      this.timeout(5000);

      const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;

      const studentResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Student3",
          email: testUsers[2].email,
          password: "password123",
          mobileNo: testUsers[2].mobile,
          role: "Student",
          status: "Active",
          classId: testClassId1.toString(),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      await axios.patch(
        `${baseURL}/users/${studentResponse.data._id}`,
        { classId: null },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const enrollments = await classEnrollmentsModel.find({
        studentId: studentResponse.data._id,
      });

      assert.strictEqual(enrollments.length, 0, "Should have removed the enrollment");
    });

    it("should not create duplicate enrollments if same classId is patched", async function() {
      this.timeout(5000);

      const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;

      const studentResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Student4",
          email: testUsers[3].email,
          password: "password123",
          mobileNo: testUsers[3].mobile,
          role: "Student",
          status: "Active",
          classId: testClassId1.toString(),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      await axios.patch(
        `${baseURL}/users/${studentResponse.data._id}`,
        { classId: testClassId1.toString() },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const enrollments = await classEnrollmentsModel.find({
        studentId: studentResponse.data._id,
      });

      assert.strictEqual(enrollments.length, 1, "Should still have only one enrollment");
    });
  });

  describe("syncClassAssignments Hook - Teacher Assignments", () => {
    it("should create multiple assignments when teacher is created with classIds[]", async function() {
      this.timeout(5000);

      const classTeachersModel = app.get("mongooseClient").models.classTeachers;

      const teacherResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Teacher",
          email: testUsers[4].email,
          password: "password123",
          mobileNo: testUsers[4].mobile,
          role: "Teacher",
          status: "Active",
          classIds: [testClassId1.toString(), testClassId2.toString()],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const assignments = await classTeachersModel.find({
        teacherId: teacherResponse.data._id,
      });

      assert.strictEqual(assignments.length, 2, "Should have created two assignments");
      const assignedClassIds = assignments.map((a: any) => a.classId.toString());
      assert.ok(assignedClassIds.includes(testClassId1.toString()));
      assert.ok(assignedClassIds.includes(testClassId2.toString()));
    });

    it("should add new assignments and keep existing ones", async function() {
      this.timeout(5000);

      const classTeachersModel = app.get("mongooseClient").models.classTeachers;

      const teacherResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Teacher2",
          email: testUsers[5].email,
          password: "password123",
          mobileNo: testUsers[5].mobile,
          role: "Teacher",
          status: "Active",
          classIds: [testClassId1.toString()],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      await axios.patch(
        `${baseURL}/users/${teacherResponse.data._id}`,
        { classIds: [testClassId1.toString(), testClassId2.toString()] },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const assignments = await classTeachersModel.find({
        teacherId: teacherResponse.data._id,
      });

      assert.strictEqual(assignments.length, 2, "Should have two assignments now");
      const assignedClassIds = assignments.map((a: any) => a.classId.toString());
      assert.ok(assignedClassIds.includes(testClassId1.toString()));
      assert.ok(assignedClassIds.includes(testClassId2.toString()));
    });

    it("should remove assignments when classIds are updated", async function() {
      this.timeout(5000);

      const classTeachersModel = app.get("mongooseClient").models.classTeachers;

      const teacherResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Teacher3",
          email: testUsers[6].email,
          password: "password123",
          mobileNo: testUsers[6].mobile,
          role: "Teacher",
          status: "Active",
          classIds: [testClassId1.toString(), testClassId2.toString()],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      await axios.patch(
        `${baseURL}/users/${teacherResponse.data._id}`,
        { classIds: [testClassId2.toString(), testClassId3.toString()] },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const assignments = await classTeachersModel.find({
        teacherId: teacherResponse.data._id,
      });

      assert.strictEqual(assignments.length, 2, "Should have two assignments");
      const assignedClassIds = assignments.map((a: any) => a.classId.toString());
      assert.ok(!assignedClassIds.includes(testClassId1.toString()), "Class 1 should be removed");
      assert.ok(assignedClassIds.includes(testClassId2.toString()));
      assert.ok(assignedClassIds.includes(testClassId3.toString()));
    });

    it("should handle empty classIds array", async function() {
      this.timeout(5000);

      const classTeachersModel = app.get("mongooseClient").models.classTeachers;

      const teacherResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Teacher4",
          email: testUsers[7].email,
          password: "password123",
          mobileNo: testUsers[7].mobile,
          role: "Teacher",
          status: "Active",
          classIds: [testClassId1.toString()],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      await axios.patch(
        `${baseURL}/users/${teacherResponse.data._id}`,
        { classIds: [] },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const assignments = await classTeachersModel.find({
        teacherId: teacherResponse.data._id,
      });

      assert.strictEqual(assignments.length, 0, "Should have no assignments left");
    });
  });

  describe("populateClassData Hook", () => {
    it("should populate assignedClass for students", async function() {
      this.timeout(5000);

      const studentResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Student5",
          email: testUsers[8].email,
          password: "password123",
          mobileNo: testUsers[8].mobile,
          role: "Student",
          status: "Active",
          classId: testClassId1.toString(),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const fetchedUser = await axios.get(
        `${baseURL}/users/${studentResponse.data._id}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.ok(fetchedUser.data.assignedClass, "assignedClass should be populated");
      assert.strictEqual(fetchedUser.data.assignedClass._id.toString(), testClassId1.toString());
      assert.strictEqual(fetchedUser.data.assignedClass.name, "Test Class 1");
    });

    it("should populate assignedClasses array for teachers", async function() {
      this.timeout(5000);

      const teacherResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Test",
          lastName: "Teacher5",
          email: testUsers[9].email,
          password: "password123",
          mobileNo: testUsers[9].mobile,
          role: "Teacher",
          status: "Active",
          classIds: [testClassId1.toString(), testClassId2.toString()],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const fetchedUser = await axios.get(
        `${baseURL}/users/${teacherResponse.data._id}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.ok(Array.isArray(fetchedUser.data.assignedClasses), "assignedClasses should be an array");
      assert.strictEqual(fetchedUser.data.assignedClasses.length, 2);
      const assignedClassNames = fetchedUser.data.assignedClasses.map((c: any) => c.name);
      assert.ok(assignedClassNames.includes("Test Class 1"));
      assert.ok(assignedClassNames.includes("Test Class 2"));
    });

    it("should populate classes in list responses (find)", async function() {
      this.timeout(5000);

      const studentResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Student",
          lastName: "6",
          email: testUsers[10].email,
          password: "password123",
          mobileNo: testUsers[10].mobile,
          role: "Student",
          status: "Active",
          classId: testClassId1.toString(),
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const teacherResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Teacher",
          lastName: "6",
          email: testUsers[11].email,
          password: "password123",
          mobileNo: testUsers[11].mobile,
          role: "Teacher",
          status: "Active",
          classIds: [testClassId1.toString(), testClassId2.toString()],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const usersResponse = await axios.get(
        `${baseURL}/users`,
        { 
          headers: { Authorization: `Bearer ${adminToken}` },
          params: {
            'email[$in]': [studentResponse.data.email, teacherResponse.data.email]
          }
        }
      );

      const s1 = usersResponse.data.data.find((u: any) => u.email === studentResponse.data.email);
      const t1 = usersResponse.data.data.find((u: any) => u.email === teacherResponse.data.email);

      assert.ok(s1.assignedClass, "s1 should have assignedClass");
      assert.strictEqual(s1.assignedClass.name, "Test Class 1");
      assert.ok(t1.assignedClasses && t1.assignedClasses.length === 2, "t1 should have 2 assignedClasses");
    });

    it("should not populate classes for Admin users", async function() {
      this.timeout(5000);

      const adminResponse = await axios.post(
        `${baseURL}/users`,
        {
          firstName: "Admin",
          lastName: "User",
          email: testUsers[12].email,
          password: "password123",
          mobileNo: testUsers[12].mobile,
          role: "Admin",
          status: "Active",
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const fetchedUser = await axios.get(
        `${baseURL}/users/${adminResponse.data._id}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.strictEqual(fetchedUser.data.assignedClass, undefined);
      assert.strictEqual(fetchedUser.data.assignedClasses, undefined);
    });
  });
});
