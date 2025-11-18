import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import mongoose from "mongoose";
import {
  TeacherCourseParams,
  TeacherCourseData,
  TeacherCourseFindResponse,
  CheckChangesResponse,
  CourseModel,
} from "../types";
import { checkCourseChanges, updateCourseContent } from "./commonCourseHandlers";

/**
 * Teacher GET handler - fetch a single course
 */
export const teacherGet = async (
  id: string,
  data: null,
  params: TeacherCourseParams,
  app: Application
): Promise<any> => {
  try {
    const course = await createCoursesModel(app).findById(id);
    if (!course) {
      throw new BadRequest("No course found");
    }
    return course;
  } catch (error) {
    throw error;
  }
};

/**
 * Teacher FIND handler - search and list courses from assigned classes
 */
export const teacherFind = async (
  id: null,
  data: null,
  params: TeacherCourseParams,
  app: Application
): Promise<TeacherCourseFindResponse | CheckChangesResponse> => {
  const { controller } = params?.query || {};

  if (controller === "teacher-courses") {
    return getTeacherCourses(params, createCoursesModel(app));
  }

  if (controller === "check-changes") {
    const courseId = params?.query?.courseId;
    if (!courseId) {
      throw new BadRequest("courseId is required to check course changes");
    }
    return checkCourseChanges(courseId, params, app);
  }

  // Default find - return courses from assigned classes
  return getTeacherCourses(params, createCoursesModel(app));
};

/**
 * Teacher PATCH handler - update course content
 */
export const teacherPatch = async (
  id: string,
  data: TeacherCourseData,
  params: TeacherCourseParams,
  app: Application
): Promise<any> => {
  return updateCourseContent(id, data, app);
};

/**
 * Get teacher courses
 * Authorization is handled by checkClassAccessForFind hook
 */
const getTeacherCourses = async (
  params: TeacherCourseParams,
  coursesModel: CourseModel
): Promise<TeacherCourseFindResponse> => {
  const query = params?.query || {};
  const { searchText, classId, skip = 0, limit = 10 } = query;

  // classId is required
  if (!classId) {
    throw new BadRequest("classId is required to fetch courses");
  }

  // Validate classId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new BadRequest("Invalid classId format");
  }

  // Build query filter for courses
  const filter: any = {
    classId: new mongoose.Types.ObjectId(classId),
    $or: [{ deleted: { $exists: false } }, { deleted: false }],
  };

  // Add search text filter if provided
  if (searchText) {
    filter.title = { $regex: new RegExp(searchText, "i") };
  }

  // Fetch courses with pagination
  const data = await coursesModel
    .find(filter)
    .sort({ last_status_changed_at: -1 })
    .skip(Number(skip))
    .limit(Number(limit))
    .lean()
    .exec();

  // Get total count
  const total = await coursesModel.countDocuments(filter);

  return {
    data,
    skip: Number(skip),
    limit: Number(limit),
    total,
  };
};

