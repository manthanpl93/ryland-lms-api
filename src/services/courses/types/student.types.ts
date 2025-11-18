import { Params } from "@feathersjs/feathers";
import { ObjectId } from "mongoose";

/**
 * Student Course Handler Types
 */

// Base handler parameters
export interface StudentCourseParams extends Params {
  user?: {
    _id: ObjectId | string;
    role: string;
    location?: ObjectId | string;
    jobTitles?: (ObjectId | string)[];
    [key: string]: any;
  };
  query?: {
    controller?: string;
    searchText?: string;
    skip?: number;
    limit?: number;
    [key: string]: any;
  };
}

// Course data for create operations (enrollment)
export interface StudentCourseData {
  courseId?: ObjectId | string;
  userId?: ObjectId | string;
  enrollmentDate?: Date;
  [key: string]: any;
}

// Student course find response
export interface StudentCourseFindResponse {
  data: any[];
  total: number;
}

// Location information
// Student handler function types
export type StudentGetHandler = (
  id: string,
  data: null,
  params: StudentCourseParams,
  app: any
) => Promise<any>;

export type StudentFindHandler = (
  id: null,
  data: null,
  params: StudentCourseParams,
  app: any
) => Promise<StudentCourseFindResponse>;

export type StudentCreateHandler = (
  id: null,
  data: StudentCourseData,
  params: StudentCourseParams,
  app: any
) => Promise<any>;

