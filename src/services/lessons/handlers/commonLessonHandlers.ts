import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import { updateCourseWithHash } from "../../../utils/course-utils";
import {
  ICreateLessonRequest,
  IUpdateLessonRequest,
  ILessonResponse,
} from "../../authors/courses/courses.types";

type LessonHandlerParams = {
  query?: {
    courseId?: string;
    sectionId?: string;
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

const getSectionIndex = (outline: any[], sectionId: string) => {
  return outline.findIndex(
    (section: any) => section._id?.toString() === sectionId.toString()
  );
};

export const createLesson = async (
  _id: null,
  data: ICreateLessonRequest,
  params: LessonHandlerParams,
  app: Application
): Promise<ILessonResponse> => {
  const courseId = params?.query?.courseId;
  const sectionId = params?.query?.sectionId;

  if (!courseId || !sectionId) {
    throw new BadRequest("Course ID and Section ID are required in query parameters");
  }

  if (!data?.title) {
    throw new BadRequest("Lesson title is required");
  }

  const course = await getCourseOutline(app, courseId);
  const outline = [...(course.outline || [])];
  const sectionIndex = getSectionIndex(outline, sectionId);

  if (sectionIndex === -1) {
    throw new BadRequest("Section not found");
  }

  const newLesson: any = {
    category: "lesson",
    title: data.title,
    contentType: data.contentType || "text",
    type: data.type || "content",
    resource: data.resource,
    content: data.content,
    videoProcessingData: data.videoProcessingData,
    quizData: data.quizData,
    metadata: {
      description: data.metadata?.description || "",
      duration: data.metadata?.duration || 0,
      isPreviewable: data.metadata?.isPreviewable ?? true,
      requiredLesson: data.metadata?.requiredLesson ?? false,
    },
    scheduleEnabled: data.scheduleEnabled || false,
    scheduleDate: data.scheduleDate,
    deadlineEnabled: data.deadlineEnabled || false,
    deadlineDate: data.deadlineDate,
    deadlinePointsEnabled: data.deadlinePointsEnabled || false,
    deadlinePoints: data.deadlinePoints,
    quizRewards: data.quizRewards,
  };

  const existingLessons = outline[sectionIndex].lessons || [];
  outline[sectionIndex].lessons = [...existingLessons, newLesson];

  const updatedCourse = await updateCourseWithHash(app, courseId, outline);
  const section = updatedCourse?.outline[sectionIndex];
  const createdLesson = section?.lessons[section.lessons.length - 1];

  if (!createdLesson) {
    throw new BadRequest("Failed to create lesson");
  }

  return createdLesson as ILessonResponse;
};

export const updateLesson = async (
  lessonId: string,
  data: IUpdateLessonRequest,
  params: LessonHandlerParams,
  app: Application
) => {
  const courseId = params?.query?.courseId;
  const sectionId = params?.query?.sectionId;

  if (!courseId || !sectionId) {
    throw new BadRequest("Course ID and Section ID are required in query parameters");
  }

  if (!lessonId) {
    throw new BadRequest("Lesson ID is required");
  }

  const course = await getCourseOutline(app, courseId);
  const outline = [...(course.outline || [])];
  const sectionIndex = getSectionIndex(outline, sectionId);

  if (sectionIndex === -1) {
    throw new BadRequest("Section not found");
  }

  const lessons = [...(outline[sectionIndex].lessons || [])];
  const lessonIndex = lessons.findIndex(
    (lesson: any) => lesson._id?.toString() === lessonId.toString()
  );

  if (lessonIndex === -1) {
    throw new BadRequest("Lesson not found");
  }

  if (data.title !== undefined) {
    lessons[lessonIndex].title = data.title;
  }
  if (data.contentType !== undefined) {
    lessons[lessonIndex].contentType = data.contentType;
  }
  if (data.type !== undefined) {
    lessons[lessonIndex].type = data.type;
  }
  if (data.resource !== undefined) {
    lessons[lessonIndex].resource = data.resource;
  }
  if (data.content !== undefined) {
    lessons[lessonIndex].content = data.content;
  }
  if (data.videoProcessingData !== undefined) {
    lessons[lessonIndex].videoProcessingData = data.videoProcessingData;
  }
  if (data.quizData !== undefined) {
    lessons[lessonIndex].quizData = data.quizData;
  }
  if (data.metadata !== undefined) {
    lessons[lessonIndex].metadata = {
      ...lessons[lessonIndex].metadata,
      ...data.metadata,
    };
  }
  if (data.scheduleEnabled !== undefined) {
    lessons[lessonIndex].scheduleEnabled = data.scheduleEnabled;
  }
  if (data.scheduleDate !== undefined) {
    lessons[lessonIndex].scheduleDate = data.scheduleDate;
  }
  if (data.deadlineEnabled !== undefined) {
    lessons[lessonIndex].deadlineEnabled = data.deadlineEnabled;
  }
  if (data.deadlineDate !== undefined) {
    lessons[lessonIndex].deadlineDate = data.deadlineDate;
  }
  if (data.deadlinePointsEnabled !== undefined) {
    lessons[lessonIndex].deadlinePointsEnabled = data.deadlinePointsEnabled;
  }
  if (data.deadlinePoints !== undefined) {
    lessons[lessonIndex].deadlinePoints = data.deadlinePoints;
  }
  if (data.quizRewards !== undefined) {
    lessons[lessonIndex].quizRewards = data.quizRewards;
  }

  outline[sectionIndex].lessons = lessons;

  const updatedCourse = await updateCourseWithHash(app, courseId, outline);
  const updatedLesson = updatedCourse?.outline[sectionIndex]?.lessons[lessonIndex];

  if (!updatedLesson) {
    throw new BadRequest("Failed to update lesson");
  }

  return updatedLesson;
};

export const deleteLesson = async (
  lessonId: string,
  _data: null,
  params: LessonHandlerParams,
  app: Application
) => {
  const courseId = params?.query?.courseId;
  const sectionId = params?.query?.sectionId;

  if (!courseId || !sectionId) {
    throw new BadRequest("Course ID and Section ID are required in query parameters");
  }

  if (!lessonId) {
    throw new BadRequest("Lesson ID is required");
  }

  const course = await getCourseOutline(app, courseId);
  const outline = [...(course.outline || [])];
  const sectionIndex = getSectionIndex(outline, sectionId);

  if (sectionIndex === -1) {
    throw new BadRequest("Section not found");
  }

  const lessons = [...(outline[sectionIndex].lessons || [])];
  const lessonIndex = lessons.findIndex(
    (lesson: any) => lesson._id?.toString() === lessonId.toString()
  );

  if (lessonIndex === -1) {
    throw new BadRequest("Lesson not found");
  }

  const removedLesson = lessons[lessonIndex];
  lessons.splice(lessonIndex, 1);
  outline[sectionIndex].lessons = lessons;

  await updateCourseWithHash(app, courseId, outline);

  return removedLesson;
};

