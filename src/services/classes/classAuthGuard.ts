import { BadRequest, Forbidden } from "@feathersjs/errors";
import { Params } from "@feathersjs/feathers";
import { Application } from "../../declarations";

const getUserContext = (params?: Params) => {
  const user = params?.user;

  if (!user?._id) {
    throw new Forbidden("Authentication required");
  }

  return user;
};

export const canAccessClass = async (
  classId: string,
  params: Params,
  app: Application
): Promise<boolean> => {
  const user = getUserContext(params);

  switch (user.role) {
  case "Admin":
    return canAdminAccessClass(classId, user.schoolId, app);
  case "Teacher":
    return isTeacherAssignedToClass(classId, user._id.toString(), app);
  case "Student":
    return isStudentEnrolledInClass(classId, user._id.toString(), app);
  default:
    return false;
  }
};

export const canModifyClass = async (
  classId: string,
  params: Params,
  app: Application
): Promise<boolean> => {
  const user = getUserContext(params);

  if (user.role !== "Admin") {
    return false;
  }

  return canAdminAccessClass(classId, user.schoolId, app);
};

export const checkClassAccess = async (context: any) => {
  const { id, method, params, app } = context;

  if (!id) {
    return context;
  }

  // Skip find and create as they don't operate on a single class instance
  if (method === "find" || method === "create") {
    return context;
  }

  const hasAccess = await canAccessClass(id, params, app);

  if (!hasAccess) {
    throw new Forbidden("You do not have permission to access this class.");
  }

  return context;
};

export const checkClassModifyPermission = async (context: any) => {
  const { id, method, params, app } = context;

  if (!id) {
    throw new BadRequest("Class ID is required for modifications");
  }

  if (!["patch", "remove", "update"].includes(method)) {
    return context;
  }

  const hasPermission = await canModifyClass(id, params, app);

  if (!hasPermission) {
    throw new Forbidden("You do not have permission to modify this class.");
  }

  return context;
};

const canAdminAccessClass = async (
  classId: string,
  schoolId: string | undefined,
  app: Application
): Promise<boolean> => {
  if (!schoolId) {
    return false;
  }

  const classesService = app.service("classes");
  const classesModel = classesService.Model;
  const classDoc: any = await classesModel.findById(classId).select("schoolId isDeleted").lean();

  if (!classDoc || classDoc.isDeleted) {
    return false;
  }

  return classDoc.schoolId?.toString() === schoolId.toString();
};

const isTeacherAssignedToClass = async (
  classId: string,
  teacherId: string,
  app: Application
): Promise<boolean> => {
  const classTeachersService = app.service("class-teachers");
  const classTeachersModel = classTeachersService.Model;
  
  const assignment = await classTeachersModel
    .findOne({ classId, teacherId, isActive: true })
    .select("_id")
    .lean();

  return Boolean(assignment);
};

const isStudentEnrolledInClass = async (
  classId: string,
  studentId: string,
  app: Application
): Promise<boolean> => {
  const classEnrollmentsService = app.service("class-enrollments");
  const classEnrollmentsModel = classEnrollmentsService.Model;
  const enrollment = await classEnrollmentsModel
    .findOne({ classId, studentId, status: "Active" })
    .select("_id")
    .lean();

  return Boolean(enrollment);
};

