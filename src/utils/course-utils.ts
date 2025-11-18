import createCoursesModel from "../models/courses.model";
import { generateContentHash } from "./courses";
import { Application } from "../declarations";

/**
 * Updates course outline and generates new content hash
 * @param app - Feathers application instance
 * @param courseId - Course ID to update
 * @param newOutline - New outline data
 * @param additionalUpdates - Additional fields to update (optional)
 * @returns Updated course document
 */
export async function updateCourseWithHash(
  app: Application,
  courseId: string,
  newOutline: any[],
  additionalUpdates: Record<string, any> = {}
) {
  // Get current course data
  const currentCourse: any = await createCoursesModel(app)
    .findById(courseId)
    .lean();

  if (!currentCourse) {
    throw new Error("Course not found");
  }

  // Create content object for hash generation
  const contentForHash: any = {
    title:
      additionalUpdates.title !== undefined
        ? additionalUpdates.title
        : currentCourse.title,
    learnings:
      additionalUpdates.learnings !== undefined
        ? additionalUpdates.learnings
        : currentCourse.learnings,
    courseImage:
      additionalUpdates.courseImage !== undefined
        ? additionalUpdates.courseImage
        : currentCourse.courseImage,
    outline: newOutline,
    certificateDetails:
      additionalUpdates.certificateDetails !== undefined
        ? additionalUpdates.certificateDetails
        : currentCourse.certificateDetails,
  };

  // Generate new hash
  const newHash = generateContentHash(contentForHash);

  // Prepare update data
  const updateData = {
    outline: newOutline,
    courseHash: newHash,
    ...additionalUpdates,
  };

  // Update course
  const updatedCourse = await createCoursesModel(app)
    .findByIdAndUpdate(courseId, { $set: updateData }, { new: true })
    .exec();

  return updatedCourse;
}

/**
 * Validates user permissions for course operations
 * Note: Now using class-teachers for access control instead of owner/authors
 * This function is deprecated and should be removed when class-teacher validation is implemented
 * @param course - Course document
 * @param userId - User ID to check
 * @param userRoles - User roles array or user role string
 * @returns boolean indicating if user has permission
 */
export function validateCoursePermissions(
  course: any,
  userId: string,
  userRoles: string[] | string = []
): boolean {
  console.log(userId);
  // Convert userRoles to array if it's a string
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
  const isAdmin = roles.includes("admin") || roles.includes("Admin");
  
  // TODO: Replace this with class-teacher validation
  // For now, admins have full access
  console.log(isAdmin);
  return isAdmin;
}

/**
 * Gets course with permission validation
 * @param app - Feathers application instance
 * @param courseId - Course ID
 * @param params - Request parameters with user info
 * @returns Course document if user has permission
 * @throws Error if course not found or user lacks permission
 */
export async function getCourseWithPermissionCheck(
  app: Application,
  courseId: string,
  params: any
): Promise<any> {
  const course: any = await createCoursesModel(app).findById(courseId).lean();

  if (!course) {
    throw new Error("Course not found");
  }

  const userId = params?.user?._id;
  const userRoles = params?.user?.roles || [];

  if (!validateCoursePermissions(course, userId, userRoles)) {
    throw new Error("You don't have permission to modify this course");
  }

  return course;
}
