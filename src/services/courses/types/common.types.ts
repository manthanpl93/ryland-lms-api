import { Application } from "../../../declarations";
import { ObjectId } from "mongoose";

/**
 * Common Course Types shared across all handlers
 */

// Base course handler signature
export type CourseHandlerFunction = (
  id: string | null,
  data: any,
  params: any,
  app: Application
) => Promise<any>;

// Course model types
export interface CourseDocument {
  _id: ObjectId | string;
  title: string;
  learnings?: string[];
  status?: string;
  courseDescription?: string;
  courseImage?: any;
  outline?: any[];
  certificateDetails?: any;
  courseHash?: string;
  deleted?: boolean;
  expirationDate?: Date;
  last_status_changed_at?: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

// Query controller types
export type CourseController =
  | "courses"
  | "admin-courses"
  | "teacher-courses"
  | "student-courses"
  | "course-report"
  | "check-changes"
  | "fetch-course-version"
  | "inviteAuthors"
  | "removeAuthor"
  | "change-status"
  | "update-certificate-details"
  | "clone-course"
  | "delete-course"
  | "get-publish-changes"
  | "acceptInvitation"
  | "download-selected-certificates";

// User role types
export type UserRole = "Admin" | "Teacher" | "Student";

// Course status types
export type CourseStatus = "draft" | "published" | "approved" | "rejected" | "archived";

// Pagination response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip?: number;
  limit?: number;
}

// Model reference type
export type CourseModel = any; // Mongoose model type

// Common error types
export interface CourseErrorResponse {
  message: string;
  code?: number;
  errors?: any[];
}

