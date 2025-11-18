// classes.types.ts - TypeScript types for classes service

export interface IForumSettings {
  enableClassForum: boolean;
  enableCourseForum: boolean;
  enableAllCourses: boolean;
  selectedCourses?: string[];
}

export interface IMessagingSettings {
  enableMessaging: boolean;
  enableAllTeachers: boolean;
  selectedTeachers?: string[];
}

export interface IClass {
  _id?: string;
  name: string;
  status: "Active" | "Inactive";
  schoolId: string;
  totalStudents: number;
  totalCourses: number;
  forumSettings?: IForumSettings;
  messagingSettings?: IMessagingSettings;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateClassRequest {
  name: string;
  // schoolId comes from authenticated user
  // All other fields use default values
}

export interface IUpdateClassRequest {
  name?: string;
  status?: "Active" | "Inactive";
  forumSettings?: IForumSettings;
  messagingSettings?: IMessagingSettings;
}

export interface IClassResponse extends IClass {}

export interface IClassesListResponse {
  total: number;
  limit: number;
  skip: number;
  data: IClass[];
}

