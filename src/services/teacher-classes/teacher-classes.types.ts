// teacher-classes.types.ts - TypeScript types for teacher classes service

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

export interface ITeacherClass {
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

export interface ITeacherClassResponse extends ITeacherClass {}

export interface ITeacherClassesListResponse {
  total: number;
  limit: number;
  skip: number;
  data: ITeacherClass[];
}

export interface ITeacherClassesQueryParams {
  status?: "Active" | "Inactive";
  search?: string;
  $limit?: number;
  $skip?: number;
  $sort?: any;
}

