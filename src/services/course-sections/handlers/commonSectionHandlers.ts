import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import { updateCourseWithHash } from "../../../utils/course-utils";
import {
  ICreateSectionRequest,
  IUpdateSectionRequest,
  ISectionResponse,
} from "../../authors/courses/courses.types";

type SectionHandlerParams = {
  query?: {
    courseId?: string;
  };
  user?: {
    _id?: string;
  };
  [key: string]: any;
};

const getCourseOutline = async (app: Application, courseId: string) => {
  const course = await createCoursesModel(app)
    .findById(courseId)
    .select("outline")
    .lean();

  if (!course) {
    throw new BadRequest("Course not found");
  }

  return course;
};

export const createSection = async (
  _id: null,
  data: ICreateSectionRequest,
  params: SectionHandlerParams,
  app: Application
): Promise<ISectionResponse> => {
  const courseId = params?.query?.courseId;
  if (!courseId) {
    throw new BadRequest("Course ID is required in query parameters");
  }

  if (!data?.title) {
    throw new BadRequest("Section title is required");
  }

  const course = await getCourseOutline(app, courseId);
  const newSection = {
    category: "module",
    title: data.title,
    lessons: data.lessons || [],
  };

  const updatedOutline = [...(course.outline || []), newSection];
  const updatedCourse = await updateCourseWithHash(app, courseId, updatedOutline);

  const createdSection = updatedCourse?.outline[updatedCourse.outline.length - 1];
  if (!createdSection) {
    throw new BadRequest("Failed to create section");
  }

  return createdSection as ISectionResponse;
};

export const updateSection = async (
  sectionId: string,
  data: IUpdateSectionRequest,
  params: SectionHandlerParams,
  app: Application
): Promise<ISectionResponse> => {
  const courseId = params?.query?.courseId;
  if (!courseId) {
    throw new BadRequest("Course ID is required in query parameters");
  }

  if (!sectionId) {
    throw new BadRequest("Section ID is required");
  }

  const course = await getCourseOutline(app, courseId);
  const outline = [...(course.outline || [])];
  const sectionIndex = outline.findIndex(
    (section: any) => section._id?.toString() === sectionId.toString()
  );

  if (sectionIndex === -1) {
    throw new BadRequest("Section not found");
  }

  if (data.title !== undefined) {
    outline[sectionIndex].title = data.title;
  }
  if (data.lessons !== undefined) {
    outline[sectionIndex].lessons = data.lessons;
  }

  const updatedCourse = await updateCourseWithHash(app, courseId, outline);
  const updatedSection = updatedCourse?.outline[sectionIndex];

  if (!updatedSection) {
    throw new BadRequest("Failed to update section");
  }

  return updatedSection as ISectionResponse;
};

export const deleteSection = async (
  sectionId: string,
  _data: null,
  params: SectionHandlerParams,
  app: Application
) => {
  const courseId = params?.query?.courseId;
  if (!courseId) {
    throw new BadRequest("Course ID is required in query parameters");
  }

  if (!sectionId) {
    throw new BadRequest("Section ID is required");
  }

  const course = await getCourseOutline(app, courseId);
  const outline = [...(course.outline || [])];
  const sectionIndex = outline.findIndex(
    (section: any) => section._id?.toString() === sectionId.toString()
  );

  if (sectionIndex === -1) {
    throw new BadRequest("Section not found");
  }

  const removedSection = outline[sectionIndex];
  outline.splice(sectionIndex, 1);

  await updateCourseWithHash(app, courseId, outline);

  return removedSection;
};

