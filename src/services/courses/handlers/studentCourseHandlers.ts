import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createPublishedCoursesModel from "../../../models/published-courses.model";
import {
  StudentCourseParams,
  StudentCourseData,
  StudentCourseFindResponse,
} from "../types";

/**
 * Student GET handler - fetch a single approved course
 */
export const studentGet = async (
  id: string,
  data: null,
  params: StudentCourseParams,
  app: Application
): Promise<any> => {
  try {
    // Students can only access approved courses
    const publishedCoursesModel = createPublishedCoursesModel(app);
    const course = await publishedCoursesModel.findById(id);
    
    if (!course) {
      throw new BadRequest("No course found");
    }
    return course;
  } catch (error) {
    throw error;
  }
};

/**
 * Student FIND handler - search and list approved courses based on location and audience
 */
export const studentFind = async (
  _id: null,
  _data: null,
  params: StudentCourseParams,
  app: Application
): Promise<StudentCourseFindResponse> => {
  return getStudentCourses(params, app);
};

/**
 * Student CREATE handler - enroll in a course or create course preview
 */
export const studentCreate = async (
  _id: null,
  _data: StudentCourseData,
  _params: StudentCourseParams,
  _app: Application
): Promise<any> => {
  void _id;
  void _data;
  void _params;
  void _app;
  try {
    // Students typically don't create full courses, but might enroll or create previews
    // This is a placeholder for student-specific create operations
    // You may want to customize this based on your actual requirements
    
    // For now, we'll throw an error indicating students can't create courses
    throw new BadRequest(
      "Students cannot create courses. Use appropriate enrollment endpoints."
    );
  } catch (e) {
    console.log("Student course create error", e);
    throw e;
  }
};

// ============ Helper Functions ============

/**
 * Get student courses based on location and job titles
 */
const getStudentCourses = async (
  params: StudentCourseParams,
  app: Application
): Promise<StudentCourseFindResponse> => {
  const query = params?.query || {};
  const { skip = 0, limit = 1000, searchText } = query;
  const publishedCoursesModel = createPublishedCoursesModel(app);

  const searchQuery: any = {
    $or: [{ deleted: false }, { deleted: { $exists: false } }],
  };

  if (searchText) {
    const rgx = (pattern: any) => new RegExp(`.*${pattern}.*`);
    const searchRgx = rgx(searchText);
    searchQuery.title = { $regex: searchRgx, $options: "i" };
  }

  const data = await publishedCoursesModel
    .find(searchQuery)
    .sort({ _id: -1 })
    .skip(Number(skip))
    .limit(Number(limit));

  const total = await publishedCoursesModel.countDocuments(searchQuery);

  return {
    data,
    total,
  };
};

