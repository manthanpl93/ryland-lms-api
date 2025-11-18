// signup.types.ts - TypeScript types for signup service

export interface ISignupRequest {
  // Admin/User Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // School Information
  schoolName: string;
  schoolType: "public" | "private" | "charter" | "online" | "university" | "college" | "training";
  address: string;
  city: string;
}

export interface ISchoolResponse {
  _id: string;
  schoolName: string;
  schoolType: string;
  status: string;
}

export interface IUserResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
  role: string;
}

export interface ISignupResponse {
  success: boolean;
  message: string;
  school: ISchoolResponse;
  user: IUserResponse;
}

