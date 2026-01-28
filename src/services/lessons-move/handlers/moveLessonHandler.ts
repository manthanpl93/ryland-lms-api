import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import { updateCourseWithHash } from "../../../utils/course-utils";

type MoveParams = {
  query?: {
    courseId?: string;
  };
  user?: {
    _id?: string;
  };
  [key: string]: any;
};

interface MoveLessonData {
  fromSectionId: string;
  toSectionId: string;
  order: number;
}

export const moveLesson = async (
  lessonId: string,
  data: MoveLessonData,
  params: MoveParams,
  app: Application
) => {
  const courseId = params?.query?.courseId;

  if (!courseId) {
    throw new BadRequest("Course ID is required in query parameters");
  }

  if (!lessonId) {
    throw new BadRequest("Lesson ID is required");
  }

  if (!data?.fromSectionId || !data?.toSectionId) {
    throw new BadRequest("fromSectionId and toSectionId are required");
  }

  if (typeof data.order !== "number") {
    throw new BadRequest("order must be a number");
  }

  if (data.fromSectionId === data.toSectionId) {
    throw new BadRequest("fromSectionId and toSectionId must be different");
  }

  const course = await createCoursesModel(app)
    .findById(courseId)
    .select("outline")
    .lean();

  if (!course) {
    throw new BadRequest("Course not found");
  }

  const outline = [...(course.outline || [])];
  
  // Find source section
  const fromSectionIndex = outline.findIndex(
    (section: any) => section._id?.toString() === data.fromSectionId.toString()
  );

  if (fromSectionIndex === -1) {
    throw new BadRequest("Source section not found");
  }

  // Find target section
  const toSectionIndex = outline.findIndex(
    (section: any) => section._id?.toString() === data.toSectionId.toString()
  );

  if (toSectionIndex === -1) {
    throw new BadRequest("Target section not found");
  }

  // Find and remove lesson from source section
  const fromLessons = [...(outline[fromSectionIndex].lessons || [])];
  const lessonIndex = fromLessons.findIndex(
    (lesson: any) => lesson._id?.toString() === lessonId.toString()
  );

  if (lessonIndex === -1) {
    throw new BadRequest("Lesson not found in source section");
  }

  const [movedLesson] = fromLessons.splice(lessonIndex, 1);
  
  // Update the lesson's order
  movedLesson.order = data.order;

  // Add lesson to target section
  const toLessons = [...(outline[toSectionIndex].lessons || [])];
  toLessons.push(movedLesson);

  // Sort target section lessons by order
  toLessons.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  // Update outline
  outline[fromSectionIndex].lessons = fromLessons;
  outline[toSectionIndex].lessons = toLessons;

  const updatedCourse = await updateCourseWithHash(app, courseId, outline);

  if (!updatedCourse) {
    throw new BadRequest("Failed to update course");
  }

  return {
    _id: updatedCourse._id,
    movedLesson: movedLesson,
    fromSection: updatedCourse.outline[fromSectionIndex],
    toSection: updatedCourse.outline[toSectionIndex],
  };
};
