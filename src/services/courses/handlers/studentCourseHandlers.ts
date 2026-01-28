import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createPublishedCoursesModel from "../../../models/published-courses.model";
import createClassEnrollmentsModel from "../../../models/class-enrollments.model";
import createStudentProgressModel from "../../../models/student-progress.model";
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
 * Get student courses filtered by their enrolled class
 * Students can only see courses from the class they're enrolled in
 */
const getStudentCourses = async (
  params: StudentCourseParams,
  app: Application
): Promise<StudentCourseFindResponse> => {
  const query = params?.query || {};
  const { skip = 0, limit = 1000, searchText } = query;
  const studentId = params?.user?._id;

  if (!studentId) {
    throw new BadRequest("Student authentication required");
  }

  // Get student's enrolled class
  const classEnrollmentsModel = createClassEnrollmentsModel(app);
  const enrollment = await classEnrollmentsModel
    .findOne({
      studentId,
      status: "Active",
    })
    .lean();

  // If student is not enrolled in any class, return empty result
  if (!enrollment) {
    return {
      data: [],
      total: 0,
    };
  }

  const publishedCoursesModel = createPublishedCoursesModel(app);

  // Build search query
  const searchQuery: any = {
    $or: [{ deleted: false }, { deleted: { $exists: false } }],
    classId: enrollment.classId, // Filter by student's enrolled class
  };

  if (searchText) {
    const rgx = (pattern: any) => new RegExp(`.*${pattern}.*`);
    const searchRgx = rgx(searchText);
    searchQuery.title = { $regex: searchRgx, $options: "i" };
  }

  const courses = await publishedCoursesModel
    .find(searchQuery)
    .select("mainCourse title courseImage outline")
    .sort({ _id: -1 })
    .skip(Number(skip))
    .limit(Number(limit))
    .lean();

  const total = await publishedCoursesModel.countDocuments(searchQuery);

  // Get student progress for these courses
  const studentProgressModel = createStudentProgressModel(app);
  const courseIds = courses.map((c: any) => c.mainCourse);
  
  const progressData = await studentProgressModel
    .find({
      userId: studentId,
      courseId: { $in: courseIds }
    })
    .select("courseId progressPercentage")
    .lean();

  // Create a map for quick lookup
  const progressMap = new Map(
    progressData.map((p: any) => [p.courseId.toString(), p.progressPercentage || 0])
  );

  /**
   * Calculate total points for a course by summing deadline points and quiz reward points
   * from all lessons in the course outline
   */
  const calculateTotalPoints = (outline: any[]): number => {
    if (!outline || !Array.isArray(outline)) {
      return 0;
    }

    let totalPoints = 0;

    outline.forEach((item: any) => {
      // If it's a module, iterate through its lessons
      if (item.category === "module" && item.lessons && Array.isArray(item.lessons)) {
        item.lessons.forEach((lesson: any) => {
          // Add deadline points if enabled
          if (lesson.deadlinePointsEnabled && lesson.deadlinePoints) {
            totalPoints += lesson.deadlinePoints;
          }
          // Add quiz reward points if available
          if (lesson.quizRewards?.additionalPoints) {
            totalPoints += lesson.quizRewards.additionalPoints;
          }
        });
      }
      // If it's a standalone lesson (not in a module)
      else if (item.category === "lesson") {
        // Add deadline points if enabled
        if (item.deadlinePointsEnabled && item.deadlinePoints) {
          totalPoints += item.deadlinePoints;
        }
        // Add quiz reward points if available
        if (item.quizRewards?.additionalPoints) {
          totalPoints += item.quizRewards.additionalPoints;
        }
      }
    });

    return totalPoints;
  };

  // Format the response with only required fields
  const data = courses.map((course: any) => ({
    courseId: course.mainCourse,
    image: course.courseImage,
    title: course.title,
    progress: progressMap.get(course.mainCourse.toString()) || 0,
    totalPoints: calculateTotalPoints(course.outline || [])
  }));

  return {
    data,
    total,
  };
};

