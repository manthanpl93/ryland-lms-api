// Import only the base types we need from the courses model
import {
  Lesson,
  Module,
  Courses
} from "../../../models/courses.model";



// Use the imported Courses interface
export type ICourse = Courses;

// Request Types for Author Courses (based on Courses interface)
export type ICreateAuthorCourseRequest = Omit<Courses, "_id" | "createdAt" | "updatedAt" | "last_status_changed_at" | "courseHash" | "deleted"> & {
  learnings?: string[]; // Make learnings optional for create
};

export type IUpdateAuthorCourseRequest = Partial<Omit<Courses, "_id" | "createdAt" | "updatedAt">>;

// Section (Module) Types (based on Module interface)
export type ICreateSectionRequest = Omit<Module, "_id" | "category"> & {
  courseId?: string; // Optional for backward compatibility, but will be required via query params
};

export type IUpdateSectionRequest = Partial<Omit<Module, "_id" | "category">> & {
  courseId?: string; // Optional for backward compatibility, but will be required via query params
};

// Lesson Request Types (based on Lesson interface)
export type ICreateLessonRequest = Omit<Lesson, "_id" | "category"> & {
  courseId?: string; // Optional for backward compatibility, but will be required via query params
  sectionId?: string; // Optional for backward compatibility, but will be required via query params
};

export type IUpdateLessonRequest = Partial<Omit<Lesson, "_id" | "category">> & {
  courseId?: string; // Optional for backward compatibility, but will be required via query params
  sectionId?: string; // Optional for backward compatibility, but will be required via query params
};

// Query Parameter Types for new API structure
export interface ISectionQueryParams {
  courseId: string;
}

export interface ILessonQueryParams {
  courseId: string;
  sectionId: string;
}

// Response Types for Sections (Modules)
export interface ISectionResponse extends Module {
  // All properties inherited from Module interface
}

export interface ISectionListResponse {
  data: ISectionResponse[];
  skip: number;
  limit: number;
  total: number;
}

// Response Types for Lessons
export interface ILessonResponse extends Lesson {
  // All properties inherited from Lesson interface
}

export interface ILessonListResponse {
  data: ILessonResponse[];
  skip: number;
  limit: number;
  total: number;
}

// Author-specific search and response types
export interface IAuthorCourseSearchParams {
  skip?: number;
  limit?: number;
  filters?: string[];
  searchText?: string;
  classId?: string; // Filter courses by class
}

export interface IAuthorCoursesListResponse {
  data: ICourse[];
  skip: number;
  limit: number;
  total: number;
} 