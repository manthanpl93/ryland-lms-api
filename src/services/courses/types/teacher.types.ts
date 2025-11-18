import { Params } from "@feathersjs/feathers";
import { ObjectId } from "mongoose";

/**
 * Teacher Course Handler Types
 */

// Base handler parameters
export interface TeacherCourseParams extends Params {
  user?: {
    _id: ObjectId | string;
    role: string;
    [key: string]: any;
  };
  query?: {
    controller?: string;
    courseId?: string;
    searchText?: string;
    classId?: string;
    skip?: number;
    limit?: number;
    [key: string]: any;
  };
}

// Course data for update operations (teachers can only patch)
export interface TeacherCourseData {
  title?: string;
  learnings?: string[];
  courseDescription?: string;
  courseImage?: string;
  outline?: TeacherCourseOutline[];
  certificateDetails?: TeacherCertificateDetails;
  [key: string]: any;
}

// Teacher course outline structure
export interface TeacherCourseOutline {
  category: "module" | "lesson";
  title?: string;
  lessons?: TeacherLessonItem[];
  // Lesson properties when category is "lesson"
  type?: "pdf" | "quiz" | "video";
  contentType?: "text" | "media";
  content?: string;
  resource?: TeacherMediaResource;
}

export interface TeacherLessonItem {
  title: string;
  category: "lesson";
  type: "pdf" | "quiz" | "video";
  contentType?: "text" | "media";
  content?: string;
  resource?: TeacherMediaResource;
}

export interface TeacherMediaResource {
  objectUrl: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  [key: string]: any;
}

// Certificate details (teachers can update)
export interface TeacherCertificateDetails {
  templateId?: string;
  signatureUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  [key: string]: any;
}

// Teacher course find response
export interface TeacherCourseFindResponse {
  data: any[];
  total: number;
  skip: number;
  limit: number;
}

// Aggregation pipeline stage types
export interface TeacherCoursePipelineStage {
  $lookup?: any;
  $match?: any;
  $project?: any;
  $sort?: any;
  $facet?: any;
}

// Teacher handler function types
export type TeacherGetHandler = (
  id: string,
  data: null,
  params: TeacherCourseParams,
  app: any
) => Promise<any>;

export type TeacherFindHandler = (
  id: null,
  data: null,
  params: TeacherCourseParams,
  app: any
) => Promise<TeacherCourseFindResponse>;

export type TeacherPatchHandler = (
  id: string,
  data: TeacherCourseData,
  params: TeacherCourseParams,
  app: any
) => Promise<any>;

