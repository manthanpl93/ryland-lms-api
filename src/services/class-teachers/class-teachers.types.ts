// class-teachers.types.ts - TypeScript types for class teachers service

export interface IClassTeacher {
  _id?: string;
  classId: string;
  teacherId: string;
  assignedDate: Date;
  assignedBy?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateTeacherAssignmentRequest {
  classId: string;
  teacherId: string;
  assignedBy?: string;
}

export interface IUpdateTeacherAssignmentRequest {
  isActive?: boolean;
}

export interface ITeacherAssignmentWithTeacher extends IClassTeacher {
  teacher: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNo?: string;
    status: string;
  };
}

export interface ITeacherAssignmentResponse extends IClassTeacher {}

export interface ITeacherAssignmentsListResponse {
  total: number;
  data: IClassTeacher[] | ITeacherAssignmentWithTeacher[];
}

