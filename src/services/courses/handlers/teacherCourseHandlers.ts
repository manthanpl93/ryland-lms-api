import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
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
 * Get teacher courses using MongoDB aggregation
 * Shows courses from all classes where teacher is assigned
 */
const getTeacherCourses = async (
  params: TeacherCourseParams,
  coursesModel: CourseModel
): Promise<TeacherCourseFindResponse> => {
  const query = params?.query || {};
  const { searchText, classId, skip = 0, limit = 10 } = query;
  const user = params?.user;

  if (!user?._id) {
    throw new Error("User not authenticated");
  }

  // Build aggregation pipeline
  const pipeline: any[] = [
    // Stage 1: Lookup class-teachers to find classes where user is a teacher
    {
      $lookup: {
        from: "class-teachers",
        localField: "classId",
        foreignField: "class",
        as: "teacherAssignments",
      },
    },
    // Stage 2: Filter courses where user is assigned as teacher
    {
      $match: {
        "teacherAssignments.teacher": user._id,
        status: { $nin: ["draft", "approved", "rejected"] },
        $or: [{ deleted: { $exists: false } }, { deleted: false }],
      },
    },
    // Stage 3: Remove the teacherAssignments field (cleanup)
    {
      $project: {
        teacherAssignments: 0,
      },
    },
  ];

  // Add search text filter if provided
  if (searchText) {
    pipeline.push({
      $match: {
        title: { $regex: new RegExp(searchText, "i") },
      },
    });
  }

  // Add classId filter if provided
  if (classId) {
    pipeline.push({
      $match: {
        classId: classId,
      },
    });
  }

  // Add sorting
  pipeline.push({
    $sort: { last_status_changed_at: -1 },
  });

  // Create a facet for both data and count
  pipeline.push({
    $facet: {
      data: [{ $skip: Number(skip) }, { $limit: Number(limit) }],
      totalCount: [{ $count: "count" }],
    },
  });

  const result = await coursesModel.aggregate(pipeline).exec();

  const data = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return {
    data,
    skip: Number(skip),
    limit: Number(limit),
    total,
  };
};

