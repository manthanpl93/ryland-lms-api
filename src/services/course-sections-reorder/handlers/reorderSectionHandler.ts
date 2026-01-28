import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import { updateCourseWithHash } from "../../../utils/course-utils";

type ReorderParams = {
  query?: {
    courseId?: string;
  };
  user?: {
    _id?: string;
  };
  [key: string]: any;
};

interface SectionOrder {
  _id: string;
  order: number;
}

interface ReorderSectionsData {
  sectionOrders: SectionOrder[];
}

export const reorderSections = async (
  _id: null,
  data: ReorderSectionsData,
  params: ReorderParams,
  app: Application
) => {
  const courseId = params?.query?.courseId;
  if (!courseId) {
    throw new BadRequest("Course ID is required in query parameters");
  }

  if (!data?.sectionOrders || !Array.isArray(data.sectionOrders)) {
    throw new BadRequest("sectionOrders array is required");
  }

  if (data.sectionOrders.length === 0) {
    throw new BadRequest("sectionOrders cannot be empty");
  }

  // Validate sectionOrders structure
  for (const item of data.sectionOrders) {
    if (!item._id || typeof item.order !== "number") {
      throw new BadRequest("Each sectionOrder must have _id and order fields");
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
  
  // Create a map for quick lookup
  const orderMap = new Map(
    data.sectionOrders.map(item => [item._id.toString(), item.order])
  );

  // Validate that all section IDs exist
  const sectionIds = new Set(outline.map((s: any) => s._id.toString()));
  for (const item of data.sectionOrders) {
    if (!sectionIds.has(item._id.toString())) {
      throw new BadRequest(`Section with ID ${item._id} not found in course`);
    }
  }

  // Update orders
  for (const section of outline) {
    const newOrder = orderMap.get(section._id.toString());
    if (newOrder !== undefined) {
      section.order = newOrder;
    }
  }

  // Sort by order
  outline.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const updatedCourse = await updateCourseWithHash(app, courseId, outline);

  if (!updatedCourse) {
    throw new BadRequest("Failed to update course");
  }

  return {
    _id: updatedCourse._id,
    outline: updatedCourse.outline,
  };
};
