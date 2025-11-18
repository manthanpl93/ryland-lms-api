// users.types.ts - TypeScript types for users service

export interface IUser {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNo?: string;
  address?: string;
  role: "Student" | "Teacher" | "Admin";
  status: "Active" | "Inactive" | "Pending";
  schoolId?: string;
  otp?: number;
  otpGeneratedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Base interface for user requests without system fields
interface IUserBase {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  address?: string;
  role: "Student" | "Teacher" | "Admin";
  status: "Active" | "Inactive" | "Pending";
  schoolId?: string;
  // Legacy fields for backward compatibility
  name?: string;
  mobileNo?: string;
  designation?: string;
  password?: string;
  jobTitles?: string[];
  position?: string;
  profilePicture?: string;
}

// For creating users - extends base with controller fields
export interface ICreateUserRequest extends IUserBase {
  controller?: string;
  records?: string;
}

// For updating users - all fields optional from base with controller
export interface IUpdateUserRequest extends Partial<IUserBase> {
  controller?: string;
}

export interface IUserResponse extends IUser {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUsersListResponse {
  data: IUserResponse[];
  skip: number;
  limit: number;
  total: number;
}

export interface IUserSearchParams {
  name?: string;
  role?: string;
  status?: string;
  schoolId?: string;
  skip?: number;
  limit?: number;
  sortQuery?: Record<string, 1 | -1>;
  searchBy?: "mobileNo" | "email" | "name";
  controller?: string;
}

export interface ICreateUserResponse {
  success: boolean;
  user: IUserResponse;
  message?: string;
}

export interface IUpdateUserResponse {
  success: boolean;
  user: IUserResponse;
  message?: string;
}

export interface IDeleteUserResponse {
  success: boolean;
  message: string;
} 