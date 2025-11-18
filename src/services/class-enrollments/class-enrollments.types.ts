// class-enrollments.types.ts - TypeScript types for class enrollments service

export interface IClassEnrollment {
  _id?: string;
  classId: string;
  studentId: string;
  enrollmentDate: Date;
  status: "Active" | "Inactive" | "Suspended" | "Withdrawn";
  enrolledBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateEnrollmentRequest {
  classId: string;
  studentId: string;
  status?: "Active" | "Inactive" | "Suspended" | "Withdrawn";
  enrolledBy?: string;
}

export interface IUpdateEnrollmentRequest {
  status?: "Active" | "Inactive" | "Suspended" | "Withdrawn";
}

export interface IBulkEnrollRequest {
  classId: string;
  studentIds: string[];
}

export interface IEnrollmentWithStudent extends IClassEnrollment {
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNo?: string;
    status: string;
  };
}

export interface IEnrollmentResponse extends IClassEnrollment {}

export interface IEnrollmentsListResponse {
  total: number;
  limit?: number;
  skip?: number;
  data: IClassEnrollment[] | IEnrollmentWithStudent[];
}

export interface IBulkEnrollResponse {
  success: Array<{
    studentId: string;
    enrollment: IClassEnrollment;
  }>;
  failed: Array<{
    studentId: string;
    error: string;
  }>;
}

