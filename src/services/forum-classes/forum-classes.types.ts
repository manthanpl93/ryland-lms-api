export interface IForumClassesResponse {
  role: "Student" | "Teacher";
  classes: IForumClass[];
}

export interface IForumClass {
  _id: string;
  name: string;
  totalStudents: number;
  totalCourses: number;
  activeDiscussions: number;
  teachers: ITeacherInfo[];
  communities: ICommunity[];
}

export interface ITeacherInfo {
  name: string;
}

export interface ICommunity {
  _id: string;
  name: string;
  type: "class" | "course";
  totalPosts: number;
  courseId?: string;
}

