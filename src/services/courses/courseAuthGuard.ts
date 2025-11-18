import { Forbidden, BadRequest } from "@feathersjs/errors";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import createCoursesModel from "../../models/courses.model";
import createClassesModel from "../../models/classes.model";
import createClassTeachersModel from "../../models/class-teachers.model";
import createClassEnrollmentsModel from "../../models/class-enrollments.model";
import { ObjectId } from "mongoose";

/**
 * Check if user can access a specific course based on role-class associations
 */
export const canAccessCourse = async (
  courseId: string,
  userId: ObjectId | string,
  params: Params,
  app: Application
): Promise<boolean> => {
  try {
    const user = params?.user;
    if (!user?._id) {
      throw new Forbidden("Authentication required");
    }

    const coursesModel = createCoursesModel(app);
    const course: any = await coursesModel
      .findById(courseId)
      .select("_id classId")
      .lean();

    if (!course) {
      throw new BadRequest("Course not found");
    }

    const normalizedUserId = userId.toString();

    const classId = course.classId ? course.classId.toString() : null;
    if (!classId) {
      return false;
    }

    switch (user.role) {
    case "Admin":
      return await canAdminAccessCourse(classId, user.schoolId, app);
    case "Teacher":
      return await isTeacherAssignedToClass(classId, normalizedUserId, app);
    case "Student":
      return await isStudentEnrolledInClass(classId, normalizedUserId, app);
    default:
      return false;
    }
  } catch (error) {
    throw error;
  }
};

export const canModifyCourse = async (
  courseId: string,
  userId: ObjectId | string,
  params: Params,
  app: Application
): Promise<boolean> => {
  return canAccessCourse(courseId, userId, params, app);
};

/**
 * Hook to check course access before operations
 * Can be used in courses.hooks.ts or other services
 */
export const checkCourseAccess = (app: Application) => {
  return async (context: any) => {
    const { id, params, method } = context;
    const userId = params?.user?._id;

    if (!userId) {
      throw new Forbidden("Authentication required");
    }

    // Skip check for find and create operations
    if (method === "find" || method === "create") {
      return context;
    }

    // For get, patch, remove operations - check ownership
    if (id) {
      const hasAccess = await canAccessCourse(id, userId, params, app);
      
      if (!hasAccess) {
        throw new Forbidden("You do not have permission to access this course.");
      }
    }

    return context;
  };
};

/**
 * Hook to check course modification permissions
 * Stricter check for write operations
 */
export const checkCourseModifyPermission = (app: Application) => {
  return async (context: any) => {
    const { id, params } = context;
    const userId = params?.user?._id;

    if (!userId) {
      throw new Forbidden("Authentication required");
    }

    // For modify operations - check ownership
    if (id) {
      const canModify = await canModifyCourse(id, userId, params, app);
      
      if (!canModify) {
        throw new Forbidden("You do not have permission to modify this course.");
      }
    }

    return context;
  };
};

const canAdminAccessCourse = async (
  classId: string,
  schoolId: ObjectId | string | undefined,
  app: Application
): Promise<boolean> => {
  if (!schoolId) {
    return false;
  }
  const classesModel = createClassesModel(app);
  const classDoc = await classesModel.findById(classId).select("schoolId").lean();
  if (!classDoc?.schoolId) {
    return false;
  }
  return classDoc.schoolId.toString() === schoolId.toString();
};

const isTeacherAssignedToClass = async (
  classId: string,
  teacherId: string,
  app: Application
): Promise<boolean> => {
  const classTeachersModel = createClassTeachersModel(app);
  const assignment = await classTeachersModel
    .findOne({ classId, teacherId, isActive: true })
    .lean();
  return Boolean(assignment);
};

const isStudentEnrolledInClass = async (
  classId: string,
  studentId: string,
  app: Application
): Promise<boolean> => {
  const classEnrollmentsModel = createClassEnrollmentsModel(app);
  const enrollment = await classEnrollmentsModel
    .findOne({ classId, studentId })
    .lean();
  return Boolean(enrollment);
};

