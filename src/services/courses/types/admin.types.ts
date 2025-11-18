import { Params } from "@feathersjs/feathers";
import { ObjectId } from "mongoose";
import { CourseDocument } from "./common.types";

/**
 * Admin Course Handler Types
 */

// Base handler parameters
export interface AdminCourseParams extends Params {
  user?: {
    _id: ObjectId | string;
    role: string;
    school?: ObjectId | string;
    [key: string]: any;
  };
  query?: {
    controller?: string;
    courseId?: string;
    searchText?: string;
    classId?: string;
    skip?: number;
    limit?: number;
    title?: string;
    filters?: CourseReportFilters;
    completionDateRage?: DateRange;
    enrolledDateRange?: DateRange;
    courseReportExport?: boolean;
    [key: string]: any;
  };
}

export interface AdminCoursesQueryOptions {
  searchText?: string;
  classId?: string;
  skip?: number;
  limit?: number;
}

export interface CourseReportQueryOptions {
  courseId: string;
  filters?: CourseReportFilters;
  searchText?: string;
  limit?: number;
  skip?: number;
  completionDateRage?: DateRange;
  enrolledDateRange?: DateRange;
  courseReportExport?: boolean;
}

// Course data for create/update operations
export interface AdminCourseData {
  title?: string;
  learnings?: string[];
  status?: "draft" | "published" | "archived" | "approved" | "rejected";
  assignments?: any[];
  outline?: CourseOutline[];
  courseDescription?: string;
  courseImage?: string;
  certificateDetails?: CertificateDetails;
  accuracy?: number;
  isReadyForPreview?: boolean;
  deleted?: boolean;
  expirationDate?: Date;
  controller?: string;
  details?: CertificateDetails;
  [key: string]: any;
}

// Course outline structure
export interface CourseOutline {
  category: "module" | "lesson";
  title?: string;
  lessons?: LessonItem[];
  // Lesson properties when category is "lesson"
  type?: "pdf" | "quiz" | "video";
  contentType?: "text" | "media";
  content?: string;
  resource?: MediaResource;
}

export interface LessonItem {
  title: string;
  category: "lesson";
  type: "pdf" | "quiz" | "video";
  contentType?: "text" | "media";
  content?: string;
  resource?: MediaResource;
}

export interface MediaResource {
  objectUrl: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  [key: string]: any;
}

// Certificate details
export interface CertificateDetails {
  templateId?: string;
  signatureUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  [key: string]: any;
}

// Course find response
export interface AdminCourseFindResponse {
  data: any[];
  total: number;
  skip?: number;
  limit?: number;
}

// Course report filters
export interface CourseReportFilters {
  certificateAvailability?: "yes" | "no" | "all";
  completed?: "yes" | "no" | "all";
  enrolledOn?: DateRange;
  completedOn?: DateRange;
}

export interface DateRange {
  from?: string | Date;
  to?: string | Date;
  startDate?: string | Date;
  endDate?: string | Date;
}

// Student report item
export interface StudentReportItem {
  _id: ObjectId | string;
  studentName: string;
  designation?: string;
  location?: string;
  locationId?: ObjectId | string;
  enrolledOn?: Date;
  completedOn?: Date;
  certificateAvailable?: boolean;
  certificateUrl?: string;
}

// Course report response
export interface CourseReportResponse {
  _id: ObjectId | string;
  title: string;
  courseDescription?: string;
  status?: string;
  courseImage?: string;
  totalParticipants: number;
  totalCompleted: number;
  studentsReport: StudentReportItem[];
  total: number;
  result?: string; // For export
}

export interface CourseReportExportResponse {
  result: string;
}

export type CourseReportHandlerResponse =
  | CourseReportResponse
  | CourseReportExportResponse;

// Check changes response
export interface CheckChangesResponse {
  hasChanges: boolean;
  canPublish: boolean;
  message: string;
}

export interface CheckCourseChangesRequest {
  courseId: string;
}

// Invite/Remove author data
// Course status change data
export interface CourseStatusChangeData {
  status: "draft" | "published" | "approved" | "rejected" | "archived";
}

// Clone course response
export type CloneCourseResponse = ObjectId | string;

export type AdminCourseResponse = CourseDocument | null;

export type AdminDeleteResponse = CourseDocument | null;

// Certificate update data
export interface CertificateUpdateData {
  details: CertificateDetails;
}

// Admin handler function types
export type AdminGetHandler = (
  id: string,
  data: null,
  params: AdminCourseParams,
  app: any
) => Promise<any>;

export type AdminFindHandler = (
  id: null,
  data: null,
  params: AdminCourseParams,
  app: any
) => Promise<AdminCourseFindResponse | CourseReportResponse | CheckChangesResponse | any>;

export type AdminCreateHandler = (
  id: null,
  data: AdminCourseData,
  params: AdminCourseParams,
  app: any
) => Promise<any>;

export type AdminPatchHandler = (
  id: string,
  data: AdminCourseData,
  params: AdminCourseParams,
  app: any
) => Promise<any>;

export type AdminDeleteHandler = (
  id: string,
  data: null,
  params: AdminCourseParams,
  app: any
) => Promise<any>;

