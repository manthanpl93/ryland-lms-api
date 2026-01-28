import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import { updateCourseWithHash } from "../../../utils/course-utils";

type ReorderParams = {
  query?: {
    courseId?: string;
    sectionId?: string;
  };
  user?: {
    _id?: string;
  };
  [key: string]: any;
};

interface LessonOrder {
  _id: string;
  order: number;
}

interface ReorderLessonsData {
  lessonOrders: LessonOrder[];
}

export const reorderLessons = async (
  _id: null,
  data: ReorderLessonsData,
  params: ReorderParams,
  app: Application
) => {
  const courseId = params?.query?.courseId;
  const sectionId = params?.query?.sectionId;

  if (!courseId || !sectionId) {
    throw new BadRequest("Course ID and Section ID are required in query parameters");
  }

  if (!data?.lessonOrders || !Array.isArray(data.lessonOrders)) {
    throw new BadRequest("lessonOrders array is required");
  }

  if (data.lessonOrders.length === 0) {
    throw new BadRequest("lessonOrders cannot be empty");
  }

  // Validate lessonOrders structure
  for (const item of data.lessonOrders) {
    if (!item._id || typeof item.order !== "number") {
      throw new BadRequest("Each lessonOrder must have _id and order fields");
    }
  }

  const course = await createCoursesModel(app)
    .findById(courseId)
    .select("outline")
    .lean();

  if (!course) {
    throw new BadRequest("Course not found");
  }

  const outline = [...(course.outline || [])];
  const sectionIndex = outline.findIndex(
    (section: any) => section._id?.toString() === sectionId.toString()
  );

  if (sectionIndex === -1) {
    throw new BadRequest("Section not found");
  }

  const lessons = [...(outline[sectionIndex].lessons || [])];
  
  // Create a map for quick lookup
  const orderMap = new Map(
    data.lessonOrders.map(item => [item._id.toString(), item.order])
  );

  // Validate that all lesson IDs exist and belong to this section
  const lessonIds = new Set(lessons.map((l: any) => l._id.toString()));
  for (const item of data.lessonOrders) {
    if (!lessonIds.has(item._id.toString())) {
      throw new BadRequest(`Lesson with ID ${item._id} not found in section`);
    }
  }

  // Update orders
  for (const lesson of lessons) {
    const newOrder = orderMap.get(lesson._id.toString());
    if (newOrder !== undefined) {
      lesson.order = newOrder;
    }
  }

  // Sort by order
  lessons.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  outline[sectionIndex].lessons = lessons;

  const updatedCourse = await updateCourseWithHash(app, courseId, outline);

  if (!updatedCourse) {
    throw new BadRequest("Failed to update course");
  }

  return {
    _id: updatedCourse._id,
    section: updatedCourse.outline[sectionIndex],
  };
};
