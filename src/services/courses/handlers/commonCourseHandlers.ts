import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import createApprovedCoursesModel from "../../../models/approved-courses.model";
import {
  AdminCourseParams,
  TeacherCourseParams,
  AdminCourseData,
  TeacherCourseData,
  CourseDocument,
  CheckChangesResponse,
} from "../types";
import { generateContentHash, CourseContentForHash } from "../../../utils/courses";

type CourseParams = AdminCourseParams | TeacherCourseParams;

/**
 * Common handler to check course changes by comparing hashes
 */
export const checkCourseChanges = async (
  courseId: string,
  params: CourseParams,
  app: Application
): Promise<CheckChangesResponse> => {
  if (!courseId) {
    throw new BadRequest("courseId is required to check course changes");
  }

  try {
    const approvedCoursesModel = createApprovedCoursesModel(app);

    // Fetch the main course with its hash
    const course: any = await createCoursesModel(app)
      .findById(courseId)
      .select("_id title courseHash")
      .lean();

    if (!course) {
      throw new BadRequest("Course not found");
    }

    // Fetch the approved course to compare hashes
    const approvedCourse: any = await approvedCoursesModel
      .findOne({ mainCourse: courseId })
      .select("_id courseHash")
      .lean();

    if (!approvedCourse) {
      return {
        hasChanges: true,
        canPublish: true,
        message: "Course has not been published yet. Ready for first publication.",
      };
    }

    // Compare hashes to determine if there are changes
    const hasChanges = course.courseHash !== approvedCourse.courseHash;

    if (hasChanges) {
      return {
        hasChanges: true,
        canPublish: true,
        message:
          "Course has been modified since last publication. Ready for republishing.",
      };
    }

    return {
      hasChanges: false,
      canPublish: false,
      message: "No changes detected. Course is up to date with published version.",
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Common content update helper used by Admin and Teacher handlers.
 * Generates hash when course content-related fields change.
 */
export const updateCourseContent = async (
  courseId: string,
  data: AdminCourseData | TeacherCourseData,
  app: Application
): Promise<CourseDocument | null> => {
  const coursesModel = createCoursesModel(app);
  const updateData = { ...data };

  if (isContentUpdate(data)) {
    const currentCourse = await coursesModel.findById(courseId).lean();

    if (currentCourse) {
      const contentForHash: CourseContentForHash = {
        title: data.title !== undefined ? data.title : currentCourse.title,
        learnings:
          data.learnings !== undefined ? data.learnings : currentCourse.learnings,
        courseImage:
          (data as AdminCourseData).courseImage !== undefined
            ? ((data as AdminCourseData).courseImage as any)
            : currentCourse.courseImage,
        outline: data.outline !== undefined ? data.outline : currentCourse.outline,
        certificateDetails:
          (data as AdminCourseData).certificateDetails !== undefined
            ? ((data as AdminCourseData).certificateDetails as any)
            : currentCourse.certificateDetails,
      };

      const newHash = generateContentHash(contentForHash);
      (updateData as AdminCourseData).courseHash = newHash;
    }
  }

  const updatedDocument = await coursesModel
    .findOneAndUpdate({ _id: courseId }, { $set: updateData }, { returnDocument: "after" })
    .exec();

  return updatedDocument as CourseDocument | null;
};

const isContentUpdate = (data: AdminCourseData | TeacherCourseData): boolean => {
  const contentFields = [
    "title",
    "learnings",
    "audience",
    "imageUrl",
    "courseImage",
    "outline",
    "certificateDetails",
  ];
  return contentFields.some((field) => Object.prototype.hasOwnProperty.call(data, field));
};


