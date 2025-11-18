// admin-classes.types.ts - TypeScript types for admin classes service

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

export interface IAdminClass {
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

export interface ICreateAdminClassRequest {
  name: string;
  // schoolId comes from authenticated user
  // All other fields use default values
}

export interface IUpdateAdminClassRequest {
  name?: string;
  status?: "Active" | "Inactive";
  forumSettings?: IForumSettings;
  messagingSettings?: IMessagingSettings;
}

export interface IAdminClassResponse extends IAdminClass {}

export interface IAdminClassesListResponse {
  total: number;
  limit: number;
  skip: number;
  data: IAdminClass[];
}

