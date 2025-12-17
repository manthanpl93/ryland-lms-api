import { Application } from "../declarations";

/**
 * Check if fromUser can contact toUser
 */
export const canContactUser = async (
  fromUserId: string,
  toUserId: string,
  app: Application
): Promise<boolean> => {
  const usersModel = app.get("mongooseClient").models.users;

  const fromUser = await usersModel.findById(fromUserId).lean();
  const toUser = await usersModel.findById(toUserId).lean();

  if (!fromUser || !toUser) return false;

  // Admin can contact anyone
  if (fromUser.role === "Admin") return true;

  // Route to role-specific validation
  if (fromUser.role === "Student") {
    return canStudentContact(fromUser, toUser, app);
  }

  if (fromUser.role === "Teacher") {
    return canTeacherContact(fromUser, toUser, app);
  }

  return false;
};

/**
 * Student contact validation
 */
const canStudentContact = async (
  student: any,
  targetUser: any,
  app: Application
): Promise<boolean> => {
  const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;

  // Get student's enrolled classes
  const studentEnrollments = await classEnrollmentsModel
    .find({
      studentId: student._id,
      status: "Active",
    })
    .select("classId")
    .lean();

  const studentClasses = studentEnrollments.map((e: any) =>
    e.classId.toString()
  );

  // Check if target is classmate
  if (targetUser.role === "Student") {
    const targetEnrollments = await classEnrollmentsModel
      .find({
        studentId: targetUser._id,
        status: "Active",
      })
      .select("classId")
      .lean();

    const targetClasses = targetEnrollments.map((e: any) =>
      e.classId.toString()
    );

    // Check for common classes
    const hasCommonClass = studentClasses.some((classId: string) =>
      targetClasses.includes(classId)
    );

    return hasCommonClass;
  }

  // Check if target is teacher of student's classes
  if (targetUser.role === "Teacher") {
    const classTeachersModel = app.get("mongooseClient").models.classTeachers;
    const teacherAssignments = await classTeachersModel
      .find({
        classId: { $in: studentClasses },
        teacherId: targetUser._id,
        isActive: true,
      })
      .select("_id")
      .lean();

    return teacherAssignments.length > 0;
  }

  return false;
};

/**
 * Teacher contact validation
 */
const canTeacherContact = async (
  teacher: any,
  targetUser: any,
  app: Application
): Promise<boolean> => {
  const classTeachersModel = app.get("mongooseClient").models.classTeachers;

  // Get teacher's classes
  const teacherAssignments = await classTeachersModel
    .find({
      teacherId: teacher._id,
      isActive: true,
    })
    .select("classId")
    .lean();

  const classIds = teacherAssignments.map((a: any) => a.classId.toString());

  // Check if target is student in teacher's class
  if (targetUser.role === "Student") {
    const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;
    const targetEnrollments = await classEnrollmentsModel
      .find({
        studentId: targetUser._id,
        classId: { $in: classIds },
        status: "Active",
      })
      .select("_id")
      .lean();

    return targetEnrollments.length > 0;
  }

  // Check if target is teacher from same school
  if (targetUser.role === "Teacher") {
    return teacher.schoolId?.toString() === targetUser.schoolId?.toString();
  }

  return false;
};

/**
 * Get school filter for multi-tenancy
 */
export const getSchoolFilter = (user: any): any => {
  if (user.role === "Admin") {
    return {}; // No filter for admins
  }

  if (user.schoolId) {
    return { schoolId: user.schoolId };
  }

  return {};
};

/**
 * Get role-based MongoDB query
 */
export const getRoleBasedQuery = (user: any): any => {
  const baseQuery: any = {};

  // Add school filter for non-admins
  if (user.role !== "Admin" && user.schoolId) {
    baseQuery.schoolId = user.schoolId;
  }

  return baseQuery;
};
