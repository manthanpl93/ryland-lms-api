export interface IForumClassesResponse {
  role: "Student" | "Teacher";
  classes: IForumClass[];
}

export interface IForumClass {
  _id: string;
  name: string;
  totalStudents: number;
  totalCourses: number;
  teachers: ITeacherInfo[];
  communities: ICommunity[];
}

export interface ITeacherInfo {
  name: string;
}

export interface ICommunity {
  name: string;
  totalPosts: number;
}

